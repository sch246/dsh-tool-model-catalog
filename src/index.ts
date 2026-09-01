/**
 * @dsh-external/dsh-tool-model-catalog
 *
 * Persistent list_models tool.
 *
 * 目的：把原先 super-injector staging 里的内存态 list_models 转成正式插件，
 * 并且把每次实时从 ctx.llm 拉到的 provider/model 目录快照落盘。
 * 实时刷新失败时回退到上次快照，重启后也能继续查询。
 *
 * 工具 schema 精简保持与原先一致：provider 可选，省略时列出全部。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { LlmModelInfo } from '@deepseek-ai/dsh-llm'

export const name = '@dsh-external/dsh-tool-model-catalog'
export const inject = ['tools', 'llm']

interface CatalogModel {
  id: string
  name: string
  description?: string
  contextWindow?: number
  maxTokens?: number
}

interface CatalogProvider {
  provider: { id: string; name: string }
  models: CatalogModel[]
  failure?: string
}

interface CatalogSnapshot {
  capturedAt: string
  advisory: true
  providers: CatalogProvider[]
}

/** listModels 实际返回可能带 contextWindow/maxTokens 运行时字段，虽然公开类型未声明。 */
type LiveModel = LlmModelInfo & { contextWindow?: number; maxTokens?: number }

const DEFAULT_STORAGE_FILE = join(homedir(), '.dsh/storages/dsh-tool-model-catalog.json')

async function readSnapshot(file: string): Promise<CatalogSnapshot | null> {
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as CatalogSnapshot
    if (parsed && Array.isArray(parsed.providers)) return parsed
    return null
  } catch {
    return null
  }
}

async function writeSnapshot(file: string, snapshot: CatalogSnapshot): Promise<void> {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 })
  await writeFile(file, JSON.stringify(snapshot, null, 2), 'utf8')
}

async function refreshCatalog(ctx: Context): Promise<CatalogSnapshot> {
  const providers = ctx.llm.listProviders()
  const groups = await Promise.all(providers.map(async (provider) => {
    try {
      const models = await ctx.llm.listModels(provider.id)
      return {
        provider: { id: provider.id, name: provider.name },
        models: models.map((model): CatalogModel => {
          const live = model as LiveModel
          return {
            id: live.id,
            name: live.name,
            ...(live.description === undefined ? {} : { description: live.description }),
            ...(live.contextWindow === undefined ? {} : { contextWindow: live.contextWindow }),
            ...(live.maxTokens === undefined ? {} : { maxTokens: live.maxTokens }),
          }
        }),
      }
    } catch (error) {
      return {
        provider: { id: provider.id, name: provider.name },
        models: [],
        failure: error instanceof Error ? error.message : String(error),
      }
    }
  }))
  return {
    capturedAt: new Date().toISOString(),
    advisory: true,
    providers: groups,
  }
}

async function refreshAndStore(ctx: Context, file: string): Promise<CatalogSnapshot> {
  const snapshot = await refreshCatalog(ctx)
  await writeSnapshot(file, snapshot)
  return snapshot
}

export function apply(ctx: Context): void {
  const storageFile = DEFAULT_STORAGE_FILE

  // 启动即尝试写入一份快照（失败不阻塞插件加载）。
  void refreshAndStore(ctx, storageFile).catch((error: unknown) => {
    ctx.logger.warn('[dsh-tool-model-catalog] initial snapshot refresh failed: %s', String(error))
  })

  // provider/model 拓扑变化时自动刷新持久化快照。
  ctx.on('llm/adapters-updated', () => {
    void refreshAndStore(ctx, storageFile).catch((error: unknown) => {
      ctx.logger.warn('[dsh-tool-model-catalog] incremental snapshot refresh failed: %s', String(error))
    })
  })

  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'list_models',
    description: 'List live model providers and the models their adapters advertise. Catalog membership is advisory; an absent model may still be routable, while only a registered provider can dispatch.',
    parameters: {
      provider: {
        type: 'string',
        description: 'Optional exact provider route; omit to list every registered provider.',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
    },
    async execute(args: { provider?: string }): Promise<string> {
      let snapshot: CatalogSnapshot
      let source: 'live' | 'cached' = 'live'
      try {
        snapshot = await refreshAndStore(ctx, storageFile)
      } catch (error) {
        const cached = await readSnapshot(storageFile)
        if (!cached) throw error
        snapshot = cached
        source = 'cached'
      }

      const selected = args.provider === undefined
        ? snapshot.providers
        : snapshot.providers.filter((entry) => entry.provider.id === args.provider)
      if (args.provider !== undefined && selected.length === 0) {
        throw new Error(`provider "${args.provider}" is not registered`)
      }

      return JSON.stringify({
        providers: selected,
        advisory: true,
        source,
        capturedAt: snapshot.capturedAt,
      }, null, 2)
    },
  })), '@dsh-external/dsh-tool-model-catalog: list_models tool')
}

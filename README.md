# @dsh-external/dsh-tool-model-catalog

Expose the live provider and model catalog to the model

## 构建与安装

```bash
DSH_CHECKOUT=<checkout> bash scripts/build.sh
cd <checkout>
DSH_HOME=<home> pnpm dsh plugin --profile web add /root/dsh-tool-model-catalog
```

插件自带 Bundle 层，安装后重启对应 profile 即可；不依赖 `super-injector`。

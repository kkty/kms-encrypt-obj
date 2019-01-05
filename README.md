# 概要

AWS Key Management Serviceを用いて、オブジェクトを暗号化・復号化するためのパッケージです。

設定ファイルなどの暗号化に使われることを想定しており、以下のような特徴があります。

- 「指定したキーに対応するバリューのみ暗号化し、それ以外は暗号化しない」ということが可能。
-  「コマンドラインでの暗号化・復号化」と「プログラム内からの復号化」が可能。
- プログラム内での利用の際、同期的に（イベントループをブロックして）復号化することも可能。 `module.exports` とともに用いるのに便利です。これについてはプログラム起動時以外に走らせることはおすすめしません。

# 使い方

## 暗号化 (コマンドライン)

JSONを読み込み、指定されたキーに対応するバリューが暗号化されたJSONを出力します。

### コマンド

```sh
kms-encrypt-obj --aws-access-key ... --aws-secret-key ... --aws-region ... --kms-key-id ... --keys-to-encrypt ... /path/to/json
```

- `aws-access-key`, `aws-secret-key`, `aws-region` については、コマンドラインで指定する代わりに、 `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_REGION` という名前の環境変数を設定することも可能です。

### 例

#### 入力ファイル

```json
{
  "key_a": "value_a",
  "key_b": "value_b",
  "key_c": "value_c"
}
```

#### コマンド

```sh
export AWS_ACCESS_KEY=...
export AWS_SECRET_KEY=...
export AWS_REGION=...
kms-encrypt-obj --kms-key-id ... --keys-to-encrypt key_b,key_c /path/to/json
```

#### 出力

```json
{
  "key_a": "value_a",
  "_encrypted": {
    "key_b": "value_b_encrypted",
    "key_c": "value_c_encrypted"
  }
}
```

標準出力に書き込まれます。


## 復号化 (コマンドライン)

上の暗号化によって作成されたJSONファイルを読み込み、復号化したものを出力します。

### コマンド

```sh
kms-decrypt-obj --aws-access-key ... --aws-secret-key ... --aws-region ... /path/to/json
```

### 例

#### 入力ファイル

```json
{
  "key_a": "value_a",
  "_encrypted": {
    "key_b": "value_b_encrypted",
    "key_c": "value_c_encrypted"
  }
}
```

#### コマンド

```sh
export AWS_ACCESS_KEY=...
export AWS_SECRET_KEY=...
export AWS_REGION=...
kms-decrypt-obj /path/to/json
```

#### 出力

```json
{
  "key_a": "value_a",
  "key_b": "value_b",
  "key_c": "value_c"
}
```

## プログラム内での利用


```js
const KmsEncryptObj = require('kms-encrypt-obj');

const kmsEncryptObj = new KmsEncryptObj({
  awsAccessKey: '...',
  awsSecretKey: '...',
  awsRegion: '...',
});

kmsEncryptObj.encrypt(
  {
    key_a: 'value_a',
    key_b: 'value_b',
    key_c: 'value_c',
  },
  'kms key id',
  ['key_b', 'key_c']
)
  .then((encrypted) => {
    // encrypted: {
    //   key_a: 'value_a',
    //   _encrypted: {
    //     key_b: 'value_b_encrypted',
    //     key_c: 'value_c_encrypted',
    //   },
    // }

    return kmsEncryptObj.decrypt(encrypted);
  })
  .then((decrypted) => {
    // decrypted: {
    //   key_a: 'value_a',
    //   key_b: 'value_b',
    //   key_c: 'value_c',
    // }
  });
```

プログラムの起動時など、同期的に処理をしたい場合には `kmsEncryptObj.decryptSync` が使用できます。
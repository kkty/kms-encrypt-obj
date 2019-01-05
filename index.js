const deasync = require('deasync');
const aws = require('aws-sdk');

// [['a', 1], ['b', 'x']] -> { a: 1, b: 'x' }
const getObjFromEntries = (entries) => {
  const obj = {};

  for (const [k, v] of entries) {
    obj[k] = v;
  }

  return obj;
};

class KmsEncryptObj {
  constructor({
    awsAccessKey,
    awsSecretKey,
    awsRegion,
  }) {
    this.kms = new aws.KMS({
      accessKeyId: awsAccessKey,
      secretAccessKey: awsSecretKey,
      region: awsRegion,
    });
  }

  /**
   * 暗号化された文字列を復号する
   * @param {string} text 暗号化され、base64エンコードされた文字列
   * @returns {Promise<string>} 復号化された文字列
   */
  _decryptString(text) {
    return new Promise((resolve, reject) => {
      this.kms.decrypt({
        CiphertextBlob: Buffer.from(text, 'base64'),
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Plaintext.toString());
        }
      });
    });
  }

  /**
   * 文字列を暗号化する
   * @param {string} text 暗号化したい文字列
   * @param {string} keyId 暗号化に用いるKMSのキーのID
   * @returns {Promise<string>} 暗号化され、base64エンコードされた文字列
   */
  _encryptString(text, keyId) {
    return new Promise((resolve, reject) => {
      this.kms.encrypt({
        KeyId: keyId,
        Plaintext: text,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.CiphertextBlob.toString('base64'));
        }
      });
    });
  }

  /**
   * オブジェクト（のバリュー）を暗号化する
   * @param {object} obj 暗号化したいオブジェクト
   * @param {string} keyId 暗号化に用いるKMSのキーのID
   * @returns {Promise<object>} 暗号化されたオブジェクト
   * { key_a: 'value_a' } -> { key_a: 'value_a_encrypted' }
   */
  _encryptObj(obj, keyId) {
    return Promise.all(Object.entries(obj).map(async ([key, value]) => {
      const valueEncrypted = await this._encryptString(JSON.stringify(value), keyId);
      return [key, valueEncrypted];
    }))
      .then(getObjFromEntries);
  }

  /**
   * オブジェクトの各キー・バリューについてバリューを復号化して返す
   * @param {object} obj
   * @returns {Promise<object>}
   * { key_a: 'value_a_encrypted' } -> { key_a: 'value_a' }
   */
  _decryptObj(obj) {
    return Promise.all(Object.entries(obj).map(async ([key, value]) => {
      const valueDecrypted = JSON.parse(await this._decryptString(value));
      return [key, valueDecrypted];
    }))
      .then(getObjFromEntries);
  }

  /**
   * @param {object} obj （特定のキーに対応するバリューを）暗号化したいオブジェクト
   * @param {string} kmsKeyId 暗号化に用いるKMSのキーのID
   * @param {Array<string>} keysToEncrypt 暗号化したいキーのリスト
   * obj = { key_a: 'value_a', key_b: 'value_b' }, keysToEncrypt = ['key_b']
   * -> { key_a: 'value_a', _encrypted: { key_b: 'value_b_encrypted' }}
   */
  async encrypt(obj, kmsKeyId, keysToEncrypt) {
    const objNotToEncrypt = {};
    const objToEncrypt = {};

    for (const key of Object.keys(obj)) {
      if (keysToEncrypt.includes(key)) {
        objToEncrypt[key] = obj[key];
      } else {
        objNotToEncrypt[key] = obj[key];
      }
    }

    return {
      ...objNotToEncrypt,
      _encrypted: await this._encryptObj(objToEncrypt, kmsKeyId),
    };
  }

  /**
   * @param {object} obj 復号化したいオブジェクト
   * @return {Promise<object>} 復号化されたオブジェクト
   * { key_a: 'value_a', _encrypted: { key_b: 'value_b_encrypted' }}
   * -> { key_a: 'value_a', key_b: 'value_b' }
   */
  async decrypt(obj) {
    const ret = {};

    for (const [k, v] of Object.entries(obj)) {
      if (k !== '_encrypted') {
        ret[k] = v;
      }
    }

    for (const [k, v] of Object.entries(await this._decryptObj(obj._encrypted))) {
      ret[k] = v;
    }

    return ret;
  }

  /** decryptの同期版 */
  decryptSync(obj) {
    return deasync(
      (obj, cb) => this.decrypt(obj).then(i => cb(null, i)).catch(err => cb(err)),
    )(obj);
  }
}

module.exports = KmsEncryptObj;

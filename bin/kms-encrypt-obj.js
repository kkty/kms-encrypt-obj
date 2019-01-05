#!/usr/bin/env node

const minimist = require('minimist');
const fs = require('fs');

const KmsEncryptObj = require('../index');

const args = minimist(process.argv.slice(2));

const [path] = args._;

const awsAccessKey = args['aws-access-key'] || process.env.AWS_ACCESS_KEY;
const awsSecretKey = args['aws-secret-key'] || process.env.AWS_SECRET_KEY;
const awsRegion = args['aws-region'] || process.env.AWS_REGION;
const kmsKeyId = args['kms-key-id'] || process.env.KMS_KEY_ID;
let keysToEncrypt = args['keys-to-encrypt'];

if (!awsAccessKey) {
  console.error('aws-access-key should be specified');
  process.exit(1);
}

if (!awsSecretKey) {
  console.error('aws-secret-key should be specified');
  process.exit(1);
}

if (!awsRegion) {
  console.error('aws-region should be specified');
  process.exit(1);
}

if (!path) {
  console.error('path should be specified');
  process.exit(1);
}

if (!kmsKeyId) {
  console.error('kms-key-id should be specified');
  process.exit(1);
}

if (!keysToEncrypt) {
  console.error('keys-to-encrypt should be specified');
  process.exit(1);
}

keysToEncrypt = keysToEncrypt.split(',');

const kmsEncryptObj = new KmsEncryptObj({
  awsAccessKey,
  awsSecretKey,
  awsRegion,
});

let data;

try {
  data = JSON.parse(fs.readFileSync(path));
} catch (err) {
  console.error('error while opening & parsing file');
  console.error(err);
  process.exit(1);
}

kmsEncryptObj.encrypt(data, kmsKeyId, keysToEncrypt)
  .then((encrypted) => {
    console.log(JSON.stringify(encrypted, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

import EthCrypto from 'eth-crypto'
import {encrypt, decrypt} from 'eccrypto'
import {publicKeyConvert} from 'secp256k1-v4'
import CryptoJS from 'crypto-js'
import Debug from './debug'

const debug = Debug('crypto', '#59f')

// To Encrypt with AES
export function encryptWithAES(message, key) {
  return CryptoJS.AES.encrypt(message, key).toString()
}

// To Decrypt with AES
export function decryptWithAES(message, key) {
  let bytes = CryptoJS.AES.decrypt(message, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// To Form Encryted Secret, no more than 15 characters supported
export async function encryptWithECIES(message, publicKey) {
  const compressedKey = EthCrypto.publicKey.compress(publicKey)

  const encryptedSecret = await encryptWithPublicKey(message, compressedKey)

  // Not using it since sqlite2 has some error with this
  // const compressedEncryptedSecret = EthCrypto.hex.compress(encryptedSecret);

  return encryptedSecret
}

// To Form Decrypted Secret, no more than 15 characters supported
export async function decryptWithECIES(message, privateKey) {
  // Message is always compressed, not using because sqlite2 has some error with this
  //const uncompressedMessage = EthCrypto.hex.decompress(message).substr(2); // to remove 0x

  return await decryptWithPrivateKey(message, privateKey)
}

// Encryption with public key
export async function encryptWithPublicKey(message, publicKey) {
  // Convert compressed public key, starts with 03 or 04
  const pubKeyUint8Array = Uint8Array.from(Buffer.from(publicKey, 'hex'))
  debug('[ENCRYPTION] Public Key Uint8Array: ' + pubKeyUint8Array)

  const convertedKeyAsUint8Array = publicKeyConvert(pubKeyUint8Array, false)
  debug('[ENCRYPTION] Public Key Converted: ' + convertedKeyAsUint8Array)

  const convertedPublicKeyHex = Buffer.from(convertedKeyAsUint8Array).toString()
  debug('[ENCRYPTION] Converted Public Key Buffer: ' + convertedPublicKeyHex)

  const pubKey = Buffer.from(convertedPublicKeyHex, 'hex')
  debug('[ENCRYPTION] pubkey getting sentout for encrypt: ' + pubKey)

  const encryptedBuffers = await encrypt(pubKey, Buffer.from(message))

  const cipher = {
    iv: encryptedBuffers.iv.toString('hex'),
    ephemPublicKey: encryptedBuffers.ephemPublicKey.toString('hex'),
    ciphertext: encryptedBuffers.ciphertext.toString('hex'),
    mac: encryptedBuffers.mac.toString('hex'),
  }
  // use compressed key because it's smaller
  // const compressedKey = Buffer.from.from(publicKeyConvert(Web3Helper.getUint8ArrayFromHexStr(cipher.ephemPublicKey), true)).toString('hex')
  const input = Uint8Array.from(Buffer.from(cipher.ephemPublicKey, 'hex'))
  const keyConvert = publicKeyConvert(input, true)
  // debug("[ENCRYPTION] Coverted key: " + keyConvert);

  const keyConvertBuffer = Buffer.from(keyConvert)
  // debug("[ENCRYPTION] Coverted key in buffer : " + keyConvertBuffer);
  // debug(keyConvertBuffer);

  debug(keyConvert)
  const compressedKey = keyConvertBuffer.toString('hex')
  // debug("[ENCRYPTION] Compressed key in buffer : ");
  // debug(compressedKey);

  return Buffer.concat([
    Buffer.from(cipher.iv, 'hex'), // 16bit
    Buffer.from(compressedKey, 'hex'), // 33bit
    Buffer.from(cipher.mac, 'hex'), // 32bit
    Buffer.from(cipher.ciphertext, 'hex'), // var bit
  ]).toString('hex')
}

// Decryption with public key
export async function decryptWithPrivateKey(message, privateKey) {
  let encrypted = message
  const buf = Buffer.from(encrypted, 'hex')
  // debug("[DECRYPTION] Buffer Passed: " + buf);

  encrypted = {
    iv: buf.toString('hex', 0, 16),
    ephemPublicKey: buf.toString('hex', 16, 49),
    mac: buf.toString('hex', 49, 81),
    ciphertext: buf.toString('hex', 81, buf.length),
  }
  // decompress publicKey
  // encrypted.ephemPublicKey = Buffer.from.from(publicKeyConvert(Web3Helper.getUint8ArrayFromHexStr(encrypted.ephemPublicKey), true)).toString('hex')
  const input = Uint8Array.from(Buffer.from(encrypted.ephemPublicKey, 'hex'))
  const keyConvert = publicKeyConvert(input, false)
  // debug("[DECRYPTION] Coverted key: " + keyConvert);

  const keyConvertBuffer = Buffer.from(keyConvert)
  // debug("[DECRYPTION] Coverted key in buffer : " + keyConvertBuffer);
  // debug(keyConvertBuffer);

  debug(keyConvert)
  const uncompressedKey = keyConvertBuffer.toString('hex')
  // debug("[DECRYPTION] Uncompressed key in buffer : ");
  // debug(uncompressedKey);

  encrypted.ephemPublicKey = uncompressedKey
  const twoStripped = privateKey.substring(2)

  const encryptedBuffer = {
    iv: Buffer.from(encrypted.iv, 'hex'),
    ephemPublicKey: Buffer.from(encrypted.ephemPublicKey, 'hex'),
    ciphertext: Buffer.from(encrypted.ciphertext, 'hex'),
    mac: Buffer.from(encrypted.mac, 'hex'),
  }

  const decryptedBuffer = await decrypt(
    Buffer.from(twoStripped, 'hex'),
    encryptedBuffer
  )
  return decryptedBuffer.toString()
}

// Testing of Encryption and Decryption from Public to Private key
export async function encryptionDecryptionPublicToPrivateTest(privateKey) {
  const startTime = new Date()
  debug('[ENCRYPTION / DECRYPTION TEST STARTED] - ', startTime)

  const publicKey = EthCrypto.publicKeyByPrivateKey(privateKey)
  const compressedKey = EthCrypto.publicKey.compress(publicKey) // is String
  debug('%s', compressedKey)

  // const bytesCompKey = Uint8Array.from(compressedKey)
  // debug('%o', bytesCompKey)

  const msgToEncrypt = 'PartialStringAS'
  const msg = await encryptWithPublicKey(msgToEncrypt, compressedKey)
  debug('Encryped Message With compressed public key:' + msg)

  const encryptionTime = new Date().getTime() - startTime.getTime()
  debug(
    '[ENCRYPTION / DECRYPTION ENCRYPTION DONE] - ' +
      encryptionTime / 1000 +
      ' secs'
  )

  // Decrypt this message
  const decryptMsg = await decryptWithPrivateKey(msg, privateKey)
  debug("[ENCRYPTION / DECRYPTION DECRYPTED MESSAGE] - '" + decryptMsg + "'")

  const decryptionTime =
    new Date().getTime() - startTime.getTime() - encryptionTime
  debug(
    '[ENCRYPTION / DECRYPTION DECRYPTION DONE] - ' +
      decryptionTime / 1000 +
      ' secs'
  )
}

// To output messge payload if required
export async function outputMsgPayload(
  secret,
  subject,
  message,
  calltoaction,
  imageurl,
  pkey
) {
  // Output AES
  debug('[AES ENCRYTED FORMAT (' + new Date() + ')')
  debug('---------------------')
  debug('secret --> ')
  const secretEncrypted = await encryptWithECIES(secret, pkey)
  const asubE = encryptWithAES(subject, secret)
  const amsgE = encryptWithAES(message, secret)
  const actaE = encryptWithAES(calltoaction, secret)
  const aimgE = encryptWithAES(imageurl, secret)

  debug(secretEncrypted)
  debug('asub --> ')
  debug(asubE)
  debug('amsg --> ')
  debug(amsgE)
  debug('acta --> ')
  debug(actaE)
  debug('aimg --> ')
  debug(aimgE)
  debug('decrypted secret --> ')
  debug(await decryptWithECIES(secretEncrypted, pkey))
  debug('decrypted asub --> ')
  debug(decryptWithAES(asubE, secret))
  debug('decrypted amsg --> ')
  debug(decryptWithAES(amsgE, secret))
  debug('decrypted acta --> ')
  debug(decryptWithAES(actaE, secret))
  debug('decrypted aimg --> ')
  debug(decryptWithAES(aimgE, secret))
}

export function makeid(length) {
  var result = '[' + new Date().toISOString() + '] '
  var characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var charactersLength = characters.length
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

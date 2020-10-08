const { dirname } = require('path')
const { promisify } = require('util')
const {
  access: access_,
  accessSync,
  copyFile: copyFile_,
  copyFileSync,
  unlink: unlink_,
  unlinkSync,
  rename: rename_,
  renameSync,
  mkdir: mkdir_,
  mkdirSync,
} = require('fs')

const access = promisify(access_)
const copyFile = promisify(copyFile_)
const unlink = promisify(unlink_)
const rename = promisify(rename_)
const mkdir = promisify(mkdir_)

const pathExists = async path => {
  try {
    await access(path)
    return true
  } catch (er) {
    return er.code !== 'ENOENT'
  }
}

const pathExistsSync = path => {
  try {
    accessSync(path)
    return true
  } catch (er) {
    return er.code !== 'ENOENT'
  }
}

module.exports = async (source, destination, options = {}) => {
  if (!source || !destination) {
    throw new TypeError('`source` and `destination` file required')
  }

  options = {
    overwrite: true,
    ...options
  }

  if (!options.overwrite && await pathExists(destination)) {
    throw new Error(`The destination file exists: ${destination}`)
  }

  await mkdir(dirname(destination), { recursive: true })

  try {
    await rename(source, destination)
  } catch (error) {
    if (error.code === 'EXDEV') {
      await copyFile(source, destination)
      await unlink(source)
    } else {
      throw error
    }
  }
}

module.exports.sync = (source, destination, options = {}) => {
  if (!source || !destination) {
    throw new TypeError('`source` and `destination` file required')
  }

  options = {
    overwrite: true,
    ...options
  }

  if (!options.overwrite && pathExistsSync(destination)) {
    throw new Error(`The destination file exists: ${destination}`)
  }

  mkdirSync(dirname(destination), { recursive: true })

  try {
    renameSync(source, destination)
  } catch (error) {
    if (error.code === 'EXDEV') {
      copyFileSync(source, destination)
      unlinkSync(source)
    } else {
      throw error
    }
  }
}

const { dirname, join } = require('path')
const { promisify } = require('util')
const {
  access: access_,
  accessSync,
  copyFile: copyFile_,
  copyFileSync,
  unlink: unlink_,
  unlinkSync,
  readdir: readdir_,
  readdirSync,
  rename: rename_,
  renameSync,
  lstat: lstat_,
  lstatSync,
} = require('fs')

const access = promisify(access_)
const copyFile = promisify(copyFile_)
const unlink = promisify(unlink_)
const readdir = promisify(readdir_)
const rename = promisify(rename_)
const lstat = promisify(lstat_)

const mkdirp = require('mkdirp')

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

const moveFile = async (source, destination, options = {}) => {
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

  await mkdirp(dirname(destination))

  try {
    await rename(source, destination)
  } catch (error) {
    if (error.code === 'EXDEV') {
      const stat = await lstat(source)
      if (stat.isDirectory()) {
        const files = await readdir(source)
        for (const file of files) {
          await moveFile(join(source, file), join(destination, file), options)
        }
      } else {
        await copyFile(source, destination)
        await unlink(source)
      }
    } else {
      throw error
    }
  }
}

const moveFileSync = (source, destination, options = {}) => {
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

  mkdirp.sync(dirname(destination))

  try {
    renameSync(source, destination)
  } catch (error) {
    if (error.code === 'EXDEV') {
      const stat = lstatSync(source)
      if (stat.isDirectory()) {
        const files = readdirSync(source)
        for (const file of files) {
          moveFileSync(join(source, file), join(destination, file), options)
        }
      } else {
        copyFileSync(source, destination)
        unlinkSync(source)
      }
    } else {
      throw error
    }
  }
}

module.exports = moveFile
module.exports.sync = moveFileSync

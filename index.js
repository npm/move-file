const { dirname, join, resolve } = require('path')
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
  stat: stat_,
  statSync,
  lstat: lstat_,
  lstatSync,
  symlink: symlink_,
  symlinkSync,
  readlink: readlink_,
  readlinkSync
} = require('fs')

const access = promisify(access_)
const copyFile = promisify(copyFile_)
const unlink = promisify(unlink_)
const readdir = promisify(readdir_)
const rename = promisify(rename_)
const stat = promisify(stat_)
const lstat = promisify(lstat_)
const symlink = promisify(symlink_)
const readlink = promisify(readlink_)

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
      const sourceStat = await lstat(source)
      if (sourceStat.isDirectory()) {
        const files = await readdir(source)
        await Promise.all(files.map((file) => moveFile(join(source, file), join(destination, file), options)))
      } else if (sourceStat.isSymbolicLink()) {
        const target = await readlink(source)
        // try to determine what the actual file is so we can create the correct type of symlink in windows
        // check for a path relative to the source first
        let targetStat
        try {
          targetStat = await stat(resolve(dirname(source), target))
        } catch (err) {}
        // the first check may fail if the target is relative to a file in the source, but we
        // have already moved that particular file, so try again relative to the destination
        if (!targetStat) {
          try {
            targetStat = await stat(resolve(dirname(destination), target))
          } catch (err) {}
        }
        await symlink(target, destination, targetStat && targetStat.isDirectory() ? 'junction' : 'file')
        await unlink(source)
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
      const sourceStat = lstatSync(source)
      if (sourceStat.isDirectory()) {
        const files = readdirSync(source)
        for (const file of files) {
          moveFileSync(join(source, file), join(destination, file), options)
        }
      } else if (sourceStat.isSymbolicLink()) {
        const target = readlinkSync(source)
        let targetStat
        try {
          targetStat = statSync(resolve(dirname(source), target))
        } catch (err) {}
        if (!targetStat) {
          try {
            targetStat = statSync(resolve(dirname(destination), target))
          } catch (err) {}
        }
        symlinkSync(target, destination, targetStat && targetStat.isDirectory() ? 'junction' : 'file')
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

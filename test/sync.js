const fs = require('fs')
const t = require('tap')
const moveFile = require('../')
const requireInject = require('require-inject')

const fixture = '🦄'

t.test('missing `source` or `destination` throws', async t => t.throws(() => moveFile.sync()))

t.test('move a file', async t => {
  const dir = t.testdir({
    src: fixture,
  })
  const dest = `${dir}/dest`
  moveFile.sync(`${dir}/src`, dest)
  t.equal(fs.readFileSync(dest, 'utf8'), fixture)
})

t.test('move a file across devices', async t => {
  const exdevError = new Error()
  exdevError.code = 'EXDEV'
  const moveFile = requireInject('../', {
    fs: {
      ...fs,
      renameSync: () => { throw exdevError },
    },
  })

  const dir = t.testdir({
    src: fixture,
  })
  const dest = `${dir}/dest`
  moveFile.sync(`${dir}/src`, dest)
  t.equal(fs.readFileSync(dest, 'utf8'), fixture)
})

t.test('other types of errors fail', async t => {
  const randoError = new Error()
  randoError.code = 'ERANDO'
  const moveFile = requireInject('../', {
    fs: {
      ...fs,
      renameSync: () => { throw randoError },
    },
  })

  const dir = t.testdir({
    src: fixture,
  })
  const dest = `${dir}/dest`
  t.throws(() => moveFile.sync(`${dir}/src`, dest), randoError)
})

t.test('overwrite option', async t => {
  const dir = t.testdir({
    src: 'x',
    dest: 'y',
  })
  t.throws(() => moveFile.sync(`${dir}/src`, `${dir}/dest`, {overwrite: false}))
  t.equal(fs.readFileSync(`${dir}/dest`, 'utf8'), 'y')
  moveFile.sync(`${dir}/src`, `${dir}/dest`)
  t.equal(fs.readFileSync(`${dir}/dest`, 'utf8'), 'x')
})

t.test('overwrite option with non-ENOENT access error', async t => {
  const dir = t.testdir({
    src: 'x',
  })
  const er = Object.assign(new Error('its there, just bad'), {
    code: 'ETHEREBUTBAD',
  })
  const moveFile = requireInject('../', {
    fs: {
      ...fs,
      accessSync: () => { throw er },
    },
  })
  t.throws(() => moveFile.sync(`${dir}/src`, `${dir}/dest`, {overwrite: false}))
  // it actually isn't there tho, so this fails, obviously
  t.throws(() => fs.readFileSync(`${dir}/dest`, 'utf8'), 'y')
  moveFile.sync(`${dir}/src`, `${dir}/dest`)
  t.equal(fs.readFileSync(`${dir}/dest`, 'utf8'), 'x')
})

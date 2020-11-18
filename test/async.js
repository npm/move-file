const fs = require('fs')
const t = require('tap')
const moveFile = require('../')
const requireInject = require('require-inject')

const fixture = '🦄'

t.test('missing `source` or `destination` throws', t => t.rejects(moveFile()))

t.test('move a file', async t => {
  const dir = t.testdir({
    src: fixture,
  })
  const dest = `${dir}/dest`
  await moveFile(`${dir}/src`, dest)
  t.equal(fs.readFileSync(dest, 'utf8'), fixture)
})

t.test('other types of errors fail', async t => {
  const randoError = new Error()
  randoError.code = 'ERANDO'
  const moveFile = requireInject('../', {
    fs: {
      ...fs,
      rename: (s, d, cb) => process.nextTick(() => cb(randoError)),
    },
  })

  const dir = t.testdir({
    src: fixture,
  })
  const dest = `${dir}/dest`
  await t.rejects(() => moveFile(`${dir}/src`, dest), randoError)
})

t.test('move a file across devices', async t => {
  const exdevError = new Error()
  exdevError.code = 'EXDEV'
  const moveFile = requireInject('../', {
    fs: {
      ...fs,
      rename: (s, d, cb) => process.nextTick(() => cb(exdevError)),
    },
  })

  const dir = t.testdir({
    src: fixture,
  })
  const dest = `${dir}/dest`
  await moveFile(`${dir}/src`, dest)
  t.equal(fs.readFileSync(dest, 'utf8'), fixture)
})

t.test('overwrite option', async t => {
  const dir = t.testdir({
    src: 'x',
    dest: 'y',
  })
  await t.rejects(moveFile(`${dir}/src`, `${dir}/dest`, {overwrite: false}))
  t.equal(fs.readFileSync(`${dir}/dest`, 'utf8'), 'y')
  await moveFile(`${dir}/src`, `${dir}/dest`)
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
      access: (p, cb) => process.nextTick(() => cb(er)),
    },
  })
  await t.rejects(moveFile(`${dir}/src`, `${dir}/dest`, {overwrite: false}))
  // it actually isn't there tho, so this fails, obviously
  t.throws(() => fs.readFileSync(`${dir}/dest`, 'utf8'), 'y')
  await moveFile(`${dir}/src`, `${dir}/dest`)
  t.equal(fs.readFileSync(`${dir}/dest`, 'utf8'), 'x')
})

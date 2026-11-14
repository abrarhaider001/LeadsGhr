import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  checkDisposable,
  checkRoleBased,
  classifyMailFrom,
  classifyRcpt,
  finalizeResult,
  isRetryable,
  normalizeVerifyEmail,
  scoreChecks,
} from '../src/email-verify/index.ts'

test('normalizeVerifyEmail accepts common addresses and rejects junk', () => {
  assert.equal(normalizeVerifyEmail(' Sales@Company.com '), 'sales@company.com')
  assert.equal(normalizeVerifyEmail('mailto:info@acme.io'), 'info@acme.io')
  assert.equal(normalizeVerifyEmail('bad@@company.com'), null)
  assert.equal(normalizeVerifyEmail(''), null)
})

test('risk checks detect disposable and role-based addresses', () => {
  assert.equal(checkDisposable('mailinator.com'), true)
  assert.equal(checkDisposable('gmail.com'), false)
  assert.equal(checkRoleBased('info@company.com'), true)
  assert.equal(checkRoleBased('abrar@company.com'), false)
})

test('classifyRcpt keeps policy blocks out of Invalid', () => {
  assert.equal(classifyRcpt(250, '2.1.5 Ok').signal, 'accepted')
  assert.equal(classifyRcpt(550, '5.1.1 User unknown').signal, 'rejected')
  assert.equal(classifyRcpt(451, '4.7.1 Greylisted').signal, 'temp')
  assert.equal(classifyRcpt(550, '5.7.1 Client host blocked').signal, 'blocked')
  assert.equal(classifyRcpt(572, 'host name is unknown').code, 'domain_not_found')
  assert.equal(classifyMailFrom(573, 'verify@localhost failed to route the address').code, 'sender_blocked')
})

test('finalizeResult decides status from signals then clamps score to that band', () => {
  const valid = finalizeResult({
    email: 'abrar@company.com',
    syntax: true,
    domain: true,
    mx: true,
    disposable: false,
    roleBased: false,
    catchAll: false,
    smtp: 'accepted',
  })
  assert.equal(valid.status, 'valid')
  assert.equal(valid.confidence, 85)

  const catchAll = finalizeResult({
    email: 'abrar@company.com',
    syntax: true,
    domain: true,
    mx: true,
    disposable: false,
    roleBased: false,
    catchAll: true,
    smtp: 'accepted',
  })
  assert.equal(catchAll.status, 'risky')
  assert.equal(catchAll.code, 'catch_all')
  assert.equal(catchAll.confidence, 45)

  const disposable = finalizeResult({
    email: 'temp@mailinator.com',
    syntax: true,
    domain: true,
    mx: true,
    disposable: true,
    roleBased: false,
    catchAll: false,
    smtp: 'unverifiable',
  })
  assert.equal(disposable.status, 'risky')
  assert.equal(disposable.code, 'disposable')
  assert.equal(disposable.confidence, 25)

  const roleAccepted = finalizeResult({
    email: 'info@company.com',
    syntax: true,
    domain: true,
    mx: true,
    disposable: false,
    roleBased: true,
    catchAll: false,
    smtp: 'accepted',
  })
  assert.equal(roleAccepted.status, 'valid')
  assert.equal(roleAccepted.checks.roleBased, true)
  assert.equal(roleAccepted.confidence, 85)

  const roleUnknown = finalizeResult({
    email: 'info@company.com',
    syntax: true,
    domain: true,
    mx: true,
    disposable: false,
    roleBased: true,
    catchAll: false,
    smtp: 'unverifiable',
  })
  assert.equal(roleUnknown.status, 'unknown')
  assert.equal(roleUnknown.confidence, 38)

  const inconsistent = finalizeResult({
    email: 'stevetilley782@gmail.com',
    syntax: false,
    domain: false,
    mx: false,
    disposable: false,
    roleBased: false,
    catchAll: false,
    smtp: 'skipped',
    code: 'accepted',
    reason: 'Accepted',
  })
  assert.equal(inconsistent.status, 'invalid')
  assert.equal(inconsistent.confidence, 0)

  const rejected = finalizeResult({
    email: 'nope@company.com',
    syntax: true,
    domain: true,
    mx: true,
    disposable: false,
    roleBased: false,
    catchAll: false,
    smtp: 'rejected',
    code: 'mailbox_not_found',
    reason: 'Mailbox not found',
  })
  assert.equal(rejected.status, 'invalid')
  assert.ok(rejected.confidence <= 20)

  const rejectedDisposable = finalizeResult({
    email: 'gone@mailinator.com',
    syntax: true,
    domain: true,
    mx: true,
    disposable: true,
    roleBased: false,
    catchAll: false,
    smtp: 'rejected',
    code: 'mailbox_not_found',
  })
  assert.equal(rejectedDisposable.status, 'invalid')
  assert.ok(rejectedDisposable.confidence <= 20)
})

test('scoreChecks never overrides status bands', () => {
  const accepted = {
    syntax: true,
    domain: true,
    mx: true,
    smtp: 'accepted' as const,
    disposable: false,
    roleBased: false,
    catchAll: false,
  }
  assert.equal(scoreChecks(accepted, 'valid'), 85)
  assert.equal(scoreChecks({ ...accepted, catchAll: true }, 'risky'), 45)
  assert.equal(scoreChecks({ ...accepted, disposable: true, smtp: 'unverifiable' }, 'risky'), 25)
  assert.equal(scoreChecks({ ...accepted, smtp: 'rejected' }, 'invalid'), 15)
  assert.equal(scoreChecks({ ...accepted, smtp: 'temp' }, 'unknown'), 55)
})

test('isRetryable only covers transient Unknown codes', () => {
  assert.equal(isRetryable({ status: 'unknown', code: 'greylist' }), true)
  assert.equal(isRetryable({ status: 'unknown', code: 'policy_block' }), false)
  assert.equal(isRetryable({ status: 'invalid', code: 'mailbox_not_found' }), false)
})

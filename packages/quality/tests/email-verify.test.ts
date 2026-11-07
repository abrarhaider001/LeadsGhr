import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  classifySmtpRcptReply,
  normalizeVerifyEmail,
  noMxResult,
  syntaxInvalidResult,
} from '../src/email-verify.ts'

test('normalizeVerifyEmail accepts common addresses and rejects junk', () => {
  assert.equal(normalizeVerifyEmail(' Sales@Company.com '), 'sales@company.com')
  assert.equal(normalizeVerifyEmail('mailto:info@acme.io'), 'info@acme.io')
  assert.equal(normalizeVerifyEmail('bad@@company.com'), null)
  assert.equal(normalizeVerifyEmail(''), null)
})

test('classifySmtpRcptReply maps acceptance, rejection, and greylist carefully', () => {
  assert.equal(classifySmtpRcptReply(250, '2.1.5 Ok').status, 'valid')
  assert.equal(classifySmtpRcptReply(550, '5.1.1 User unknown').status, 'invalid')
  assert.equal(classifySmtpRcptReply(451, '4.7.1 Greylisted').status, 'unknown')
  assert.equal(classifySmtpRcptReply(552, 'mailbox full').status, 'risky')
})

test('syntax and MX helpers stay explicit about limits', () => {
  assert.equal(syntaxInvalidResult('nope').status, 'invalid')
  assert.equal(noMxResult('a@missing.test').status, 'invalid')
  assert.match(noMxResult('a@missing.test').reason, /No mail exchanger/)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  emailBodyLooksLikeHtml,
  emailTemplateDraftSchema,
  emailTemplateFromMailer,
  emailTemplateToMailer,
  emailTemplatesFromMailerFile,
} from '../src/email-templates.ts'

test('plain and HTML bodies are told apart by tags', () => {
  assert.equal(emailBodyLooksLikeHtml('Hi {{name}}\n\nThanks'), false)
  assert.equal(emailBodyLooksLikeHtml('<p>Hi {{name}}</p>'), true)
  assert.equal(emailBodyLooksLikeHtml('Score < 3'), false)
})

test('a Mailer row becomes a desktop template and round-trips', () => {
  const updatedAt = Date.parse('2026-11-24T04:00:00.000Z')
  const template = emailTemplateFromMailer({
    id: 'tmpl-1',
    name: 'Introduction',
    subject: 'Hello {{name}}',
    bodyHtml: 'Hi {{name}}',
    updatedAt,
  })
  assert.ok(template)
  assert.equal(template.format, 'plain')
  assert.equal(template.updatedAt, '2026-11-24T04:00:00.000Z')
  assert.deepEqual(emailTemplateToMailer(template), {
    id: 'tmpl-1',
    name: 'Introduction',
    subject: 'Hello {{name}}',
    bodyHtml: 'Hi {{name}}',
    format: 'plain',
    updatedAt,
  })
})

test('an explicit plain format is kept when the body also contains tags', () => {
  const template = emailTemplateFromMailer({
    id: 'tmpl-2',
    name: 'Note',
    subject: 'Hello',
    bodyHtml: 'Use <br> sparingly',
    format: 'plain',
    updatedAt: 1_700_000_000_000,
  })
  assert.equal(template?.format, 'plain')
})

test('a Mailer file skips a bad row and sorts by name', () => {
  const list = emailTemplatesFromMailerFile([
    { id: 'b', name: 'Follow-up', subject: 'Hi', bodyHtml: '<p>Hi</p>', updatedAt: 10 },
    { id: 'bad' },
    { id: 'a', name: 'alpha', subject: 'Hi', bodyHtml: 'Hi', updatedAt: 10 },
  ])
  assert.deepEqual(
    list?.map((item) => item.name),
    ['alpha', 'Follow-up'],
  )
})

test('a file that is not a list is left unread', () => {
  assert.equal(emailTemplatesFromMailerFile({ templates: [] }), null)
  assert.equal(emailTemplatesFromMailerFile([{ id: 'x' }]), null)
})

test('a draft needs a name, subject, and body', () => {
  assert.equal(
    emailTemplateDraftSchema.safeParse({
      id: 'tmpl-1',
      name: '  ',
      subject: 'Hello',
      format: 'html',
      body: '<p>Hi</p>',
    }).success,
    false,
  )
  assert.equal(
    emailTemplateDraftSchema.safeParse({
      id: 'tmpl-1',
      name: 'Hello',
      subject: 'Hello {{name}}',
      format: 'html',
      body: '<p>Hi</p>',
    }).success,
    true,
  )
})

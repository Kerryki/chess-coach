/**
 * Unit tests for the provider-agnostic AI text generation layer
 * Mocks both @anthropic-ai/sdk and @google/genai to test provider dispatch and error mapping
 */

jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn()

  class MockAPIError extends Error {
    status: number
    headers?: Record<string, string>

    constructor(status: number, _error: unknown, message: string, headers?: Record<string, string>) {
      super(message)
      this.status = status
      this.headers = headers
    }
  }

  const MockAnthropic: any = jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
  MockAnthropic.APIError = MockAPIError

  return {
    __esModule: true,
    default: MockAnthropic,
    __mockCreate: mockCreate,
    __MockAPIError: MockAPIError,
  }
})

jest.mock('@google/genai', () => {
  const mockGenerateContent = jest.fn()
  const mockGenerateContentStream = jest.fn()

  class MockApiError extends Error {
    status: number

    constructor({ message, status }: { message: string; status: number }) {
      super(message)
      this.status = status
    }
  }

  const MockGoogleGenAI: any = jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
    },
  }))

  return {
    __esModule: true,
    GoogleGenAI: MockGoogleGenAI,
    ApiError: MockApiError,
    __mockGenerateContent: mockGenerateContent,
    __mockGenerateContentStream: mockGenerateContentStream,
  }
})

import { generateText, streamText } from '../../../lib/coaching/providers'

const anthropicMock = jest.requireMock('@anthropic-ai/sdk') as any
const geminiMock = jest.requireMock('@google/genai') as any

async function* claudeTextDeltaStream(chunks: string[]) {
  for (const text of chunks) {
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text } }
  }
}

async function* geminiTextStream(chunks: string[]) {
  for (const text of chunks) {
    yield { text }
  }
}

describe('generateText', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns text from Claude', async () => {
    anthropicMock.__mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Claude explanation' }],
    })

    const result = await generateText('claude', {
      apiKey: 'sk-ant-test',
      systemPrompt: 'system',
      prompt: 'prompt',
      maxTokens: 100,
    })

    expect(result).toBe('Claude explanation')
    expect(anthropicMock.__mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: expect.stringContaining('claude'), max_tokens: 100 }),
    )
  })

  it('returns text from Gemini', async () => {
    geminiMock.__mockGenerateContent.mockResolvedValue({ text: 'Gemini explanation' })

    const result = await generateText('gemini', {
      apiKey: 'AIzaTest',
      systemPrompt: 'system',
      prompt: 'prompt',
      maxTokens: 100,
    })

    expect(result).toBe('Gemini explanation')
    expect(geminiMock.__mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.stringContaining('gemini'),
        config: expect.objectContaining({ maxOutputTokens: 100 }),
      }),
    )
  })

  it('maps a Claude 401 to INVALID_API_KEY', async () => {
    anthropicMock.__mockCreate.mockRejectedValue(
      new anthropicMock.__MockAPIError(401, {}, 'unauthorized', {}),
    )

    await expect(
      generateText('claude', { apiKey: 'bad', systemPrompt: '', prompt: 'p', maxTokens: 10 }),
    ).rejects.toMatchObject({ code: 'INVALID_API_KEY' })
  })

  it('maps a Claude 429 to RATE_LIMIT', async () => {
    anthropicMock.__mockCreate.mockRejectedValue(
      new anthropicMock.__MockAPIError(429, {}, 'rate limited', {}),
    )

    await expect(
      generateText('claude', { apiKey: 'k', systemPrompt: '', prompt: 'p', maxTokens: 10 }),
    ).rejects.toMatchObject({ code: 'RATE_LIMIT' })
  })

  it('maps a Gemini 400 to INVALID_API_KEY', async () => {
    geminiMock.__mockGenerateContent.mockRejectedValue(
      new geminiMock.ApiError({ message: 'invalid key', status: 400 }),
    )

    await expect(
      generateText('gemini', { apiKey: 'bad', systemPrompt: '', prompt: 'p', maxTokens: 10 }),
    ).rejects.toMatchObject({ code: 'INVALID_API_KEY' })
  })

  it('maps a Gemini 429 to RATE_LIMIT', async () => {
    geminiMock.__mockGenerateContent.mockRejectedValue(
      new geminiMock.ApiError({ message: 'rate limited', status: 429 }),
    )

    await expect(
      generateText('gemini', { apiKey: 'k', systemPrompt: '', prompt: 'p', maxTokens: 10 }),
    ).rejects.toMatchObject({ code: 'RATE_LIMIT' })
  })
})

describe('streamText', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('accumulates streamed chunks from Claude and calls onChunk', async () => {
    anthropicMock.__mockCreate.mockResolvedValue(claudeTextDeltaStream(['Hello ', 'world']))

    const chunks: string[] = []
    const controller = new AbortController()

    const result = await streamText('claude', {
      apiKey: 'sk-ant-test',
      systemPrompt: 'system',
      prompt: 'prompt',
      maxTokens: 100,
      signal: controller.signal,
      onChunk: (text) => chunks.push(text),
    })

    expect(result).toBe('Hello world')
    expect(chunks).toEqual(['Hello ', 'Hello world'])
  })

  it('accumulates streamed chunks from Gemini and calls onChunk', async () => {
    geminiMock.__mockGenerateContentStream.mockResolvedValue(geminiTextStream(['Hi ', 'there']))

    const chunks: string[] = []
    const controller = new AbortController()

    const result = await streamText('gemini', {
      apiKey: 'AIzaTest',
      systemPrompt: 'system',
      prompt: 'prompt',
      maxTokens: 100,
      signal: controller.signal,
      onChunk: (text) => chunks.push(text),
    })

    expect(result).toBe('Hi there')
    expect(chunks).toEqual(['Hi ', 'Hi there'])
  })

  it('lets an AbortError propagate unwrapped instead of mapping it to an AppError', async () => {
    const abortError = new DOMException('aborted', 'AbortError')
    anthropicMock.__mockCreate.mockRejectedValue(abortError)

    const controller = new AbortController()

    await expect(
      streamText('claude', {
        apiKey: 'k',
        systemPrompt: '',
        prompt: 'p',
        maxTokens: 10,
        signal: controller.signal,
        onChunk: () => {},
      }),
    ).rejects.toBe(abortError)
  })
})

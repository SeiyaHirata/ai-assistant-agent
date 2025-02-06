import '@testing-library/jest-dom'

// Mock the OpenAI client
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      beta: {
        assistants: {
          create: jest.fn().mockResolvedValue({
            id: 'test-assistant-id',
            name: 'AI Secretary'
          })
        },
        threads: {
          create: jest.fn().mockResolvedValue({ id: 'test-thread-id' }),
          messages: {
            create: jest.fn().mockResolvedValue({}),
            list: jest.fn().mockResolvedValue({
              data: [{
                content: [{ 
                  text: { 
                    value: '明日の午後2時は空いています。予定を入れますか？' 
                  } 
                }]
              }]
            })
          },
          runs: {
            create: jest.fn().mockResolvedValue({ id: 'test-run-id' }),
            retrieve: jest.fn().mockResolvedValue({ status: 'completed' }),
            submitToolOutputs: jest.fn().mockResolvedValue({})
          }
        }
      }
    }))
  }
})

// Mock the Google Calendar API
jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn().mockReturnValue({
      events: {
        list: jest.fn().mockResolvedValue({
          data: {
            items: []
          }
        }),
        insert: jest.fn().mockResolvedValue({
          data: {
            id: 'test-event-id',
            summary: 'Test Event'
          }
        })
      }
    })
  }
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      accessToken: 'test-token'
    },
    status: 'authenticated'
  })),
  signIn: jest.fn(),
  signOut: jest.fn()
}))

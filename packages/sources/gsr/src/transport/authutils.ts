import crypto from 'crypto'
import axios from 'axios'
import { config } from '../config'
import { makeLogger } from '@chainlink/external-adapter-framework/util'

const logger = makeLogger('GSR Auth Token Utils')

interface TokenError {
  success: false
  ts: number
  error: string
}

interface TokenSuccess {
  success: true
  ts: number
  token: string
  validUntil: string
}

type AccessTokenResponse = TokenError | TokenSuccess

const currentTimeNanoSeconds = (): number => new Date(Date.now()).getTime() * 1000000

const generateSignature = (userId: string, publicKey: string, privateKey: string, ts: number) =>
  crypto
    .createHmac('sha256', privateKey)
    .update(`userId=${userId}&apiKey=${publicKey}&ts=${ts}`)
    .digest('hex')

export const getToken = async (settings: typeof config.settings) => {
  logger.debug('Fetching new access token')

  const userId = settings.WS_USER_ID
  const publicKey = settings.WS_PUBLIC_KEY
  const privateKey = settings.WS_PRIVATE_KEY
  const ts = currentTimeNanoSeconds()
  const signature = generateSignature(userId, publicKey, privateKey, ts)
  const response = await axios.post<AccessTokenResponse>(`${settings.API_ENDPOINT}/token`, {
    apiKey: publicKey,
    userId,
    ts,
    signature,
  })

  if (!response.data.success) {
    logger.error('Unable to get access token')
    throw new Error(response.data.error)
  }

  return response.data.token
}

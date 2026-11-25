import type { PipelineProvider } from '@leadsghr/schemas'
import { FcGoogle } from 'react-icons/fc'
import { FaLinkedin } from 'react-icons/fa'
import { SiFacebook } from 'react-icons/si'

const googleMapsPin = new URL('../../../public/google-maps-pin.svg', import.meta.url).href

export function PipelineProviderIcon({
  provider,
  size = 24,
}: {
  provider: PipelineProvider
  size?: number
}) {
  const icon =
    provider === 'google-maps' ? (
      <img src={googleMapsPin} width={size} height={size} alt="" />
    ) : provider === 'google' ? (
      <FcGoogle size={size} />
    ) : provider === 'facebook' ? (
      <SiFacebook size={size} color="#0866FF" />
    ) : (
      <FaLinkedin size={size} color="#0A66C2" />
    )
  return (
    <span className="la-provider-brand-icon" aria-hidden="true">
      {icon}
    </span>
  )
}

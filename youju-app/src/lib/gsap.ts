import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// 全局默认值：ease + duration
gsap.defaults({ ease: 'power3.out', duration: 0.9 })

// ScrollTrigger 全局配置：忽略移动端地址栏收缩导致的 resize
ScrollTrigger.config({ ignoreMobileResize: true })

// reduced-motion 降级：若开启无障碍减弱动画，设置正常时长（避免置 0 导致某些动画回调不触发）
if (
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  gsap.defaults({ duration: 0.01 })
}

export { gsap, ScrollTrigger }

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// 全局默认值：ease + duration
gsap.defaults({ ease: 'power3.out', duration: 0.9 })

// ScrollTrigger 全局配置：忽略移动端地址栏收缩导致的 resize
ScrollTrigger.config({ ignoreMobileResize: true })

// reduced-motion 降级：全局 timeScale(0) 跳过所有动画
if (
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  gsap.globalTimeline.timeScale(0)
}

export { gsap, ScrollTrigger }

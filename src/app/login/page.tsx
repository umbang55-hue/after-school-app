'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // 이메일 로그인
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('로그인 실패: ' + error.message)
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  // 구글 로그인 추가
  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      alert('구글 로그인 실패: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8 border border-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-2">👋 반가워요!</h1>
          <p className="text-gray-500 font-medium">방과후학교 수강 신청을 위해 로그인해 주세요.</p>
        </div>

        {/* 구글 로그인 버튼 (최상단 강조) */}
        <Button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-8 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-100 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-sm transition-all active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          구글 계정으로 시작하기
        </Button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-100"></div>
          <span className="flex-shrink mx-4 text-gray-300 text-xs font-bold uppercase tracking-widest">또는 이메일로 로그인</span>
          <div className="flex-grow border-t border-gray-100"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-500 ml-1">이메일 주소</label>
            <input 
              type="email" 
              placeholder="example@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-500 ml-1">비밀번호</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
              required
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-100 transition-all active:scale-95"
          >
            {loading ? '로그인 중...' : '이메일로 로그인'}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 font-medium">
          관리자 문의: 정보부 선생님
        </p>
      </div>
    </div>
  )
}

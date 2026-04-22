'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert(error.message)
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      alert(error.message)
    } else {
      alert('확인 메일을 보냈습니다. 이메일을 확인해 주세요!')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">방과후학교 신청 로그인</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="example@school.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleLogin} 
              disabled={loading} 
              className="flex-1"
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
            <Button 
              onClick={handleSignUp} 
              disabled={loading} 
              variant="outline" 
              className="flex-1"
            >
              회원가입
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

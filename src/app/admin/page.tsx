'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      alert('관리자 권한이 없습니다.')
      router.push('/')
      return
    }

    setIsAdmin(true)
    fetchData()
  }

  const fetchData = async () => {
    setLoading(true)
    
    // 1. 강좌 현황 가져오기
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: true })

    // 2. 상세 신청 내역 가져오기 (Join 사용)
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select(`
        id,
        status,
        created_at,
        profiles (full_name, student_id, phone_number),
        courses (title)
      `)
      .order('created_at', { ascending: false })

    setCourses(coursesData || [])
    setEnrollments(enrollmentsData || [])
    setLoading(false)
  }

  if (!isAdmin || loading) {
    return <div className="flex items-center justify-center min-h-screen">데이터를 불러오는 중...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">방과후 학교 관리자 대시보드</h1>
        <Button onClick={() => router.push('/')} variant="outline">홈으로 돌아가기</Button>
      </div>

      {/* 1. 강좌별 요약 현황 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2 text-blue-600">📊 강좌별 요약 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="p-4 border rounded-lg bg-white shadow-sm">
              <h3 className="font-bold text-lg">{course.title}</h3>
              <p className="text-sm text-gray-500">{course.instructor}</p>
              <div className="mt-2 flex justify-between items-end">
                <span className="text-sm font-medium">신청 인원:</span>
                <span className={`text-xl font-bold ${course.current_count >= course.max_capacity ? 'text-red-500' : 'text-blue-600'}`}>
                  {course.current_count} / {course.max_capacity}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 mt-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${course.current_count >= course.max_capacity ? 'bg-red-500' : 'bg-blue-600'}`} 
                  style={{ width: `${Math.min((course.current_count / course.max_capacity) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 전체 신청자 상세 명단 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2 text-green-600">📋 전체 신청자 상세 명단</h2>
        <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청 시간</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학번</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청 강좌</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 italic">아직 신청자가 없습니다.</td>
                </tr>
              ) : (
                enrollments.map((en) => (
                  <tr key={en.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(en.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {en.profiles?.full_name || '이름 없음'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {en.profiles?.student_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">
                      {en.courses?.title || '알 수 없는 강좌'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {en.profiles?.phone_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        en.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        en.status === 'waiting' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {en.status === 'approved' ? '승인됨' : 
                         en.status === 'waiting' ? '대기자' : '대기중'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button onClick={fetchData} className="bg-gray-800 text-white hover:bg-black transition-all">새로고침</Button>
      </div>
    </div>
  )
}

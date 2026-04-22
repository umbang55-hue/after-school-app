'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  
  // 신청 폼 상태
  const [formData, setFormData] = useState({
    privacy_agreed: false,
    grade: '',
    class_number: '',
    student_number: '',
    full_name: '',
    phone_number: '',
    parent_phone_number: ''
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('title', { ascending: true })

    if (error) {
      console.error('Supabase Error Detail:', error)
      setError(error)
    } else {
      setCourses(data || [])
      setError(null)
    }
    setLoading(false)
  }

  const handleEnrollClick = async (course: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // 이미 프로필 정보가 있는지 확인 (선택 사항: 매번 입력받을지, 한 번만 받을지)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setSelectedCourse(course)
    
    // 기존 정보가 있다면 폼에 미리 채워줌
    if (profile) {
      setFormData({
        privacy_agreed: profile.privacy_agreed || false,
        grade: profile.grade?.toString() || '',
        class_number: profile.class_number?.toString() || '',
        student_number: profile.student_number?.toString() || '',
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        parent_phone_number: profile.parent_phone_number || ''
      })
    }
    
    setShowModal(true)
  }

  const submitEnrollment = async () => {
    if (!formData.privacy_agreed) {
      alert('개인정보 활용에 동의하셔야 신청이 가능합니다.')
      return
    }

    if (!formData.grade || !formData.class_number || !formData.student_number || !formData.full_name || !formData.phone_number || !formData.parent_phone_number) {
      alert('모든 정보를 정확히 입력해 주세요.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. 프로필 정보 업데이트
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        grade: parseInt(formData.grade),
        class_number: parseInt(formData.class_number),
        student_number: parseInt(formData.student_number),
        phone_number: formData.phone_number,
        parent_phone_number: formData.parent_phone_number,
        privacy_agreed: true
      })
      .eq('id', user.id)

    if (profileError) {
      alert('프로필 저장 중 오류: ' + profileError.message)
      return
    }

    // 2. 수강 신청 RPC 호출
    const { data, error }: any = await supabase.rpc('enroll_course', {
      p_course_id: selectedCourse.id,
      p_user_id: user.id
    })

    if (error) {
      alert('신청 오류: ' + error.message)
    } else {
      if (data.success) {
        alert(data.message)
        setShowModal(false)
        fetchCourses()
      } else {
        alert(data.message)
      }
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="max-w-[90rem] mx-auto p-6 min-h-screen bg-gray-50/50">
      <header className="mb-12 text-center pt-8">
        <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">🏫 방과후학교 수강 신청</h1>
        <p className="text-gray-500 text-xl font-medium">원하는 강좌를 선택하여 선착순으로 신청하세요!</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-100 p-6 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-[1.4rem] font-bold text-gray-800 leading-tight break-keep">{course.title}</h2>
                <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-2xl font-bold text-[0.7rem] shrink-0 ml-2">
                  정원 {course.max_capacity}명
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                  <span className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg text-base">👤</span>
                  {course.instructor}
                </div>
                <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                  <span className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg text-base">🕒</span>
                  {course.schedule}
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[0.6rem] text-gray-400 font-bold mb-1 uppercase tracking-widest">현재 인원</span>
                <span className={`text-2xl font-black ${course.current_count >= course.max_capacity ? 'text-red-500' : 'text-blue-600'}`}>
                  {course.current_count} <span className="text-sm text-gray-300 font-medium">/ {course.max_capacity}</span>
                </span>
              </div>
              <Button 
                onClick={() => handleEnrollClick(course)}
                disabled={course.current_count >= course.max_capacity}
                className={`px-6 py-6 rounded-2xl font-black text-base transition-all shadow-lg ${
                  course.current_count >= course.max_capacity 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-blue-300'
                }`}
              >
                {course.current_count >= course.max_capacity ? '마감' : '신청'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* 수강 신청 상세 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-10 relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            
            <h2 className="text-3xl font-black mb-2 text-gray-900">📝 수강 신청서 작성</h2>
            <p className="text-blue-600 font-bold mb-8 flex items-center gap-2">
              <span className="bg-blue-100 px-2 py-0.5 rounded text-sm">강좌명</span> {selectedCourse?.title}
            </p>

            <div className="space-y-8">
              {/* 1. 개인정보 동의 */}
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-sm font-medium text-gray-700 leading-relaxed mb-4">
                  1. 수강신청서의 제출로 방과후학교 수강 관리 및 문자 전송을 위해 보호자와 학생의 성명과 휴대전화 번호 등의 개인정보를 활용하는 것에 동의하십니까? 
                  <span className="block mt-1 text-gray-400 text-xs">(개인정보보유기간: 제2기 방과후학교 운영기간)</span>
                </p>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer font-bold ${formData.privacy_agreed ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
                    <input type="radio" className="hidden" name="privacy" checked={formData.privacy_agreed === true} onChange={() => setFormData({...formData, privacy_agreed: true})} /> 예
                  </label>
                  <label className={`flex-1 flex items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer font-bold ${formData.privacy_agreed === false ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
                    <input type="radio" className="hidden" name="privacy" checked={formData.privacy_agreed === false} onChange={() => setFormData({...formData, privacy_agreed: false})} /> 아니요
                  </label>
                </div>
              </div>

              {/* 2~4. 학년/반/번호 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 ml-1">학년</label>
                  <select 
                    value={formData.grade} 
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
                  >
                    <option value="">선택</option>
                    {[1, 2, 3].map(v => <option key={v} value={v}>{v}학년</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 ml-1">반</label>
                  <select 
                    value={formData.class_number} 
                    onChange={(e) => setFormData({...formData, class_number: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
                  >
                    <option value="">선택</option>
                    {[1, 2, 3, 4, 5, 6].map(v => <option key={v} value={v}>{v}반</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 ml-1">번호</label>
                  <select 
                    value={formData.student_number} 
                    onChange={(e) => setFormData({...formData, student_number: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
                  >
                    <option value="">선택</option>
                    {Array.from({length: 22}, (_, i) => i + 1).map(v => <option key={v} value={v}>{v}번</option>)}
                  </select>
                </div>
              </div>

              {/* 5~7. 이름 및 연락처 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 ml-1">이름</label>
                  <input 
                    type="text" placeholder="실명을 입력해 주세요" 
                    value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 ml-1">학생 연락처</label>
                  <input 
                    type="tel" placeholder="010-0000-0000" 
                    value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 ml-1">학부모 연락처</label>
                  <input 
                    type="tel" placeholder="010-0000-0000" 
                    value={formData.parent_phone_number} onChange={(e) => setFormData({...formData, parent_phone_number: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
                  />
                </div>
              </div>

              <Button 
                onClick={submitEnrollment}
                className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-blue-100 transition-all active:scale-95 mt-6"
              >
                제출 및 신청 완료
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
        user_id,
        status,
        created_at,
        profiles (full_name, grade, class_number, student_number, phone_number, parent_phone_number, privacy_agreed),
        courses (title, instructor)
      `)
      .order('created_at', { ascending: false })

    setCourses(coursesData || [])
    setEnrollments(enrollmentsData || [])
    setLoading(false)
  }

  // 학년·반·번호를 "1학년 2반 3번" 형식으로
  const formatStudentNo = (p: any) =>
    p?.grade && p?.class_number && p?.student_number
      ? `${p.grade}학년 ${p.class_number}반 ${p.student_number}번`
      : '-'

  const statusLabel = (status: string) =>
    status === 'approved' ? '승인됨' : status === 'waiting' ? '대기자' : '대기중'

  // CSV 파일 저장 공통 함수 (엑셀에서 한글이 깨지지 않게 BOM 추가)
  const saveCsv = (lines: string[], name: string) => {
    const csv = '\uFEFF' + lines.join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const today = new Date()
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    a.href = url
    a.download = `${name}_${ymd}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 구글 설문 응답과 같은 시간 형식: 2026. 8. 24 오후 1:02:18
  const formTime = (iso: string) => {
    const d = new Date(iso)
    const h = d.getHours()
    const ampm = h < 12 ? '오전' : '오후'
    const h12 = h % 12 === 0 ? 12 : h % 12
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} ${ampm} ${h12}:${mm}:${ss}`
  }

  // 구글 설문 응답 형식으로 내려받기: 학생 한 명당 한 줄, 신청 강좌는 쉼표로 이어서
  const downloadFormCsv = () => {
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const phone = (v: any) => (v ? `="${String(v).replace(/"/g, '')}"` : '')

    // 강좌별 대기 순번 계산 (신청 시간 순)
    const waitingNo: Record<string, number> = {}
    const counter: Record<string, number> = {}
    ;[...enrollments]
      .filter((en) => en.status === 'waiting')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach((en) => {
        const key = en.courses?.title || ''
        counter[key] = (counter[key] || 0) + 1
        waitingNo[en.id] = counter[key]
      })

    // 학생(계정)별로 묶기
    const byStudent: Record<string, { profile: any; first: string; items: any[] }> = {}
    enrollments.forEach((en) => {
      const key = en.user_id
      if (!byStudent[key]) byStudent[key] = { profile: en.profiles, first: en.created_at, items: [] }
      if (new Date(en.created_at) < new Date(byStudent[key].first)) byStudent[key].first = en.created_at
      byStudent[key].items.push(en)
    })

    const students = Object.values(byStudent).sort((a, b) =>
      (a.profile?.grade ?? 99) - (b.profile?.grade ?? 99) ||
      (a.profile?.class_number ?? 99) - (b.profile?.class_number ?? 99) ||
      (a.profile?.student_number ?? 99) - (b.profile?.student_number ?? 99)
    )

    const courseLabel = (en: any) => {
      const teacher = (en.courses?.instructor || '').replace(/\s*선생님\s*$/, '')
      const base = teacher ? `${en.courses?.title}(${teacher})` : en.courses?.title
      return en.status === 'waiting' ? `${base} 대기자 신청(대기 ${waitingNo[en.id]}번)` : base
    }

    const header = [
      '타임스탬프',
      '수강신청서의 제출로 방과후학교 수강 관리 및 문자 전송을 위해 보호자와 학생의 성명과 휴대전화 번호 등의 개인정보를 활용하는 것에 동의하십니까? (개인정보보유기간 : 제4기 방과후학교 운영기간)',
      '학년',
      '반',
      '번호',
      '이름',
      '방과후학교 수업을 신청하는 학생의 연락처',
      '학생 보호자의 연락처',
      '희망하는 방과후학교 수업을 선택하세요.(복수 선택 가능)',
    ]

    const lines = students.map(({ profile, first, items }) => {
      const courses = [...items]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(courseLabel)
        .join(', ')
      return [
        escape(formTime(first)),
        escape(profile?.privacy_agreed === false ? '아니요' : '예'),
        escape(profile?.grade),
        escape(profile?.class_number),
        escape(profile?.student_number),
        escape(profile?.full_name),
        phone(profile?.phone_number),
        phone(profile?.parent_phone_number),
        escape(courses),
      ].join(',')
    })

    saveCsv([header.map(escape).join(','), ...lines], '제4기_방과후학교_수강신청(응답)')
  }

  // 강좌별 명단 내려받기: 강좌별 → 승인 먼저 → 신청 순서
  const downloadCsv = () => {
    const statusOrder: Record<string, number> = { approved: 0, waiting: 1, pending: 2 }
    const rows = [...enrollments].sort((a, b) =>
      (a.courses?.title || '').localeCompare(b.courses?.title || '', 'ko') ||
      (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    // 전화번호 앞의 0이 엑셀에서 사라지지 않게 ="010..." 형식으로
    const phone = (v: any) => (v ? `="${String(v).replace(/"/g, '')}"` : '')

    const header = ['신청 강좌', '상태', '신청 시간', '이름', '학년', '반', '번호', '학생 연락처', '보호자 연락처']
    const lines = rows.map((en) => [
      escape(en.courses?.title),
      escape(statusLabel(en.status)),
      escape(new Date(en.created_at).toLocaleString('ko-KR')),
      escape(en.profiles?.full_name),
      escape(en.profiles?.grade),
      escape(en.profiles?.class_number),
      escape(en.profiles?.student_number),
      phone(en.profiles?.phone_number),
      phone(en.profiles?.parent_phone_number),
    ].join(','))

    saveCsv([header.map(escape).join(','), ...lines], '방과후_강좌별_명단')
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
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-xl font-semibold text-green-600">📋 전체 신청자 상세 명단</h2>
          <div className="flex gap-2">
            <Button
              onClick={downloadFormCsv}
              disabled={enrollments.length === 0}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              📥 신청 현황 (구글 설문 형식)
            </Button>
            <Button
              onClick={downloadCsv}
              disabled={enrollments.length === 0}
              variant="outline"
            >
              📥 강좌별 명단
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청 시간</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학번</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청 강좌</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학생 연락처</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">보호자 연락처</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 italic">아직 신청자가 없습니다.</td>
                </tr>
              ) : (
                enrollments.map((en) => (
                  <tr key={en.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(en.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {en.profiles?.full_name || '이름 없음'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatStudentNo(en.profiles)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">
                      {en.courses?.title || '알 수 없는 강좌'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {en.profiles?.phone_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {en.profiles?.parent_phone_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        en.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        en.status === 'waiting' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {statusLabel(en.status)}
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

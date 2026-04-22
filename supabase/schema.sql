-- 1. Profiles 테이블 생성 (사용자 추가 정보)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  student_id TEXT,
  phone_number TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Courses 테이블 생성 (강좌 정보)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  instructor TEXT,
  schedule TEXT,
  price INTEGER DEFAULT 0,
  max_capacity INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enrollments 테이블 생성 (수강 신청 기록)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, course_id) -- 중복 신청 방지
);

-- 4. RLS (Row Level Security) 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 정책 설정 (예시: 누구나 강좌 조회 가능, 본인 프로필만 수정 가능 등)
CREATE POLICY "Public courses are viewable by everyone" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. 수강 신청용 RPC (Database Function) - Race Condition 방지용
CREATE OR REPLACE FUNCTION enroll_course(p_course_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_current_count INTEGER;
  v_max_capacity INTEGER;
BEGIN
  -- 강좌 정보 잠금 (FOR UPDATE) 및 확인
  SELECT current_count, max_capacity INTO v_current_count, v_max_capacity
  FROM public.courses
  WHERE id = p_course_id
  FOR UPDATE;

  IF v_current_count >= v_max_capacity THEN
    RETURN json_build_object('success', false, 'message', '정원이 초과되었습니다.');
  END IF;

  -- 이미 신청했는지 확인
  IF EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = p_user_id AND course_id = p_course_id) THEN
    RETURN json_build_object('success', false, 'message', '이미 신청한 강좌입니다.');
  END IF;

  -- 신청 내역 추가
  INSERT INTO public.enrollments (user_id, course_id)
  VALUES (p_user_id, p_course_id);

  -- 강좌 인원 증가
  UPDATE public.courses
  SET current_count = current_count + 1
  WHERE id = p_course_id;

  RETURN json_build_object('success', true, 'message', '신청이 완료되었습니다.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', '오류가 발생했습니다: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 6. 실제 강좌 데이터 추가
INSERT INTO public.courses (title, instructor, schedule, price, max_capacity, current_count, status)
VALUES 
('배드민턴', '황규창 선생님', '7월 27일~31일 / 08:50~12:20', 70000, 15, 0, 'open'),
('배구', '엄인우 선생님', '8월 3일~7일 / 08:50~12:20', 70000, 15, 0, 'open'),
('농구', '이성운 선생님', '7월 21일~25일 / 08:50~12:20', 70000, 15, 0, 'open'),
('프로그래밍 언어', '서강혁 선생님', '7월 27일~31일 / 08:50~12:20', 70000, 15, 0, 'open');

const { Client } = require('pg');

const connectionString = 'postgresql://postgres.bkjcygltovktorvoinuz:Realjackus78!@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function updateDatabase() {
  try {
    await client.connect();
    console.log('데이터베이스 연결 중...');

    const sql = `
      -- 1. enrollments 테이블의 status 체크 제약 조건 업데이트 ('waiting' 추가)
      ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
      ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_status_check 
        CHECK (status IN ('pending', 'approved', 'waiting'));

      -- 2. 수강 신청 함수(RPC) 고도화
      CREATE OR REPLACE FUNCTION enroll_course(p_course_id UUID, p_user_id UUID)
      RETURNS JSON AS $$
      DECLARE
        v_current_count INTEGER;
        v_max_capacity INTEGER;
        v_waiting_count INTEGER;
        v_enroll_status TEXT;
      BEGIN
        -- 강좌 정보 잠금 및 확인
        SELECT current_count, max_capacity INTO v_current_count, v_max_capacity
        FROM public.courses
        WHERE id = p_course_id
        FOR UPDATE;

        -- 이미 신청(정상 또는 대기)했는지 확인
        IF EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = p_user_id AND course_id = p_course_id) THEN
          RETURN json_build_object('success', false, 'message', '이미 신청(또는 대기) 중인 강좌입니다.');
        END IF;

        -- 인원 체크 로직
        IF v_current_count < v_max_capacity THEN
          -- 1. 정원 내 신청 (승인 상태)
          v_enroll_status := 'approved';
          
          UPDATE public.courses
          SET current_count = current_count + 1
          WHERE id = p_course_id;
          
          INSERT INTO public.enrollments (user_id, course_id, status)
          VALUES (p_user_id, p_course_id, v_enroll_status);
          
          RETURN json_build_object('success', true, 'message', '수강 신청이 완료되었습니다!');
        ELSE
          -- 2. 정원 초과 시 대기자 체크
          SELECT count(*) INTO v_waiting_count
          FROM public.enrollments
          WHERE course_id = p_course_id AND status = 'waiting';

          IF v_waiting_count < 10 THEN
            v_enroll_status := 'waiting';
            
            INSERT INTO public.enrollments (user_id, course_id, status)
            VALUES (p_user_id, p_course_id, v_enroll_status);
            
            RETURN json_build_object('success', true, 'message', '정원이 초과되어 [대기 ' || (v_waiting_count + 1) || '번]으로 등록되었습니다.');
          ELSE
            RETURN json_build_object('success', false, 'message', '정원 및 대기 인원(10명)이 모두 마감되었습니다.');
          END IF;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN json_build_object('success', false, 'message', '오류가 발생했습니다: ' || SQLERRM);
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(sql);
    console.log('✅ 대기자 시스템(최대 10명)이 데이터베이스에 반영되었습니다.');
  } catch (err) {
    console.error('❌ 오류 발생:', err.message);
  } finally {
    await client.end();
  }
}

updateDatabase();

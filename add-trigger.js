const { Client } = require('pg');

const connectionString = 'postgresql://postgres.bkjcygltovktorvoinuz:Realjackus78!@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function addTrigger() {
  try {
    await client.connect();
    console.log('데이터베이스 연결 중...');

    // 1. 트리거 함수 생성 (새 유저 가입 시 프로필 자동 생성)
    const sql = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (new.id, new.raw_user_meta_data->>'full_name', 'student');
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- 2. 트리거 설정 (auth.users 테이블에 새 유저 추가 시 함수 실행)
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;
    
    await client.query(sql);
    console.log('✅ 프로필 자동 생성 트리거가 설치되었습니다.');
  } catch (err) {
    console.error('❌ 오류 발생:', err.message);
  } finally {
    await client.end();
  }
}

addTrigger();

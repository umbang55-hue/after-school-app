alter table public.courses add column if not exists price_note text;

update public.courses
   set price = 0,
       price_note = '서울시 교육청 AI중점학교 예산 지원'
 where title = '프로그래밍 언어';

select title, price, price_note from public.courses order by title;

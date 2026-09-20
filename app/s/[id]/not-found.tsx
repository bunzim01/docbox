export default function ShareNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <p className="mb-2 text-base font-semibold tracking-[0.18em] text-gold">LIKEWAY DOCBOX</p>
      <p className="text-xl font-bold">문서를 찾을 수 없습니다</p>
      <p className="mt-2 text-base text-zinc-500">
        링크가 잘못되었거나, 보낸 사람이 문서를 지웠을 수 있습니다.
      </p>
    </main>
  );
}

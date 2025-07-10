export default function HomePage() {
  console.log('HomePage server-side render starting...');
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Debug Page</h1>
      <p className="mt-4 text-lg">
        If you can see this, the basic page rendering is working.
      </p>
    </div>
  );
}

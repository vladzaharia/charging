export default function ChargerLoading() {
  return (
    <main className="flex flex-col p-6 h-screen">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-xl border-2 border-charge-blue bg-slate-900/10 backdrop-blur backdrop-opacity-85 drop-shadow-lg">
          <div className="text-center space-y-6">
            {/* Loading Title */}
            <h1 className="text-2xl font-display font-bold text-charge-blue">Loading Charger</h1>

            {/* Loading Description */}
            <p className="text-white text-lg">Connecting to the charging station...</p>

            {/* Loading Progress */}
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="bg-charge-blue h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

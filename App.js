const { useState, useEffect, useRef } = React;

const App = () => {
    const [assets, setAssets] = useState([]);
    const [search, setSearch] = useState("");
    const [editIndex, setEditIndex] = useState(null);
    const [showDeadlines, setShowDeadlines] = useState(false); // Toggle for the master list
    const [formData, setFormData] = useState({ name: "", mot: "", ins: "", svc: "", tax: "", ref: "", link: "" });
    const fileInputRef = useRef(null);

    useEffect(() => {
        const data = localStorage.getItem("asset_data");
        if (data) setAssets(JSON.parse(data));
    }, []);

    const saveData = (newAssets) => {
        setAssets(newAssets);
        localStorage.setItem("asset_data", JSON.stringify(newAssets));
    };

    // --- LOGIC: MASTER DEADLINE SORTER ---
    const getSortedDeadlines = () => {
        const allDeadlines = [];
        const dateLabels = { mot: "MOT", ins: "Insurance", svc: "Service", tax: "Tax" };

        assets.forEach(asset => {
            Object.keys(dateLabels).forEach(key => {
                if (asset[key] && asset[key].includes("/")) {
                    const [d, m, y] = asset[key].split("/");
                    const dateObj = new Date(y, m - 1, d);
                    allDeadlines.push({
                        name: asset.name,
                        label: dateLabels[key],
                        dateStr: asset[key],
                        sortBy: dateObj.getTime()
                    });
                }
            });
        });

        // Sort by time (closest date first)
        return allDeadlines.sort((a, b) => a.sortBy - b.sortBy);
    };

    const handleSave = () => {
        if (!formData.name) return alert("Asset Name is required");
        const recordToSave = { ...formData, lastUpdated: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) };
        let newAssets = [...assets];
        if (editIndex !== null) { newAssets[editIndex] = recordToSave; setEditIndex(null); }
        else { newAssets.unshift(recordToSave); }
        saveData(newAssets);
        setFormData({ name: "", mot: "", ins: "", svc: "", tax: "", ref: "", link: "" });
    };

    const downloadIcs = (e, asset) => {
        e.stopPropagation();
        const formatIcsDate = (s) => { if (!s || !s.includes("/")) return null; const [d, m, y] = s.split("/"); return `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}`; };
        let ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AssetManager//EN"];
        ['mot', 'ins', 'svc', 'tax'].forEach(k => {
            const d = formatIcsDate(asset[k]);
            if (d) ics.push("BEGIN:VEVENT", `SUMMARY:${k.toUpperCase()}: ${asset.name}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d}`, "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", "END:VALARM", "END:VEVENT");
        });
        ics.push("END:VCALENDAR");
        const b = new Blob([ics.join("\n")], { type: "text/calendar" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${asset.name}.ics`; a.click();
    };

    const filtered = assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="max-w-2xl mx-auto min-h-screen bg-gray-100 pb-10 font-sans">
            {/* Header */}
            <header className="bg-blue-800 p-4 text-white shadow-md flex justify-between items-center sticky top-0 z-40">
                <h1 className="font-bold text-lg">AssetManager</h1>
                <div className="flex gap-2">
                    <button onClick={() => setShowDeadlines(true)} className="text-[10px] bg-green-600 px-2 py-1 rounded border border-green-500 font-bold uppercase shadow-sm active:bg-green-700">📅 Deadlines</button>
                    <button onClick={() => fileInputRef.current.click()} className="text-[10px] bg-blue-600 px-2 py-1 rounded border border-blue-400 font-bold uppercase active:bg-blue-500">Restore</button>
                    <input type="file" ref={fileInputRef} onChange={(e) => { /* Restore logic as before */ }} className="hidden" />
                </div>
            </header>

            {/* Input Grid (Always Visible) */}
            <section className={`p-4 shadow-md mb-4 border-b-2 transition-colors ${editIndex !== null ? 'bg-amber-50 border-amber-200' : 'bg-white border-blue-100'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="p-3 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Asset Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input className="p-3 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Reference #" value={formData.ref} onChange={e => setFormData({...formData, ref: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    {['mot', 'ins', 'svc', 'tax'].map(key => (
                        <div key={key}>
                            <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">{key === 'ins' ? 'Insurance' : key}</label>
                            <input className="w-full p-2 border rounded bg-gray-50 text-sm" placeholder="DD/MM/YYYY" value={formData[key]} onChange={e => setFormData({...formData, [key]: e.target.value})} />
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={handleSave} className={`flex-1 font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all ${editIndex !== null ? 'bg-amber-600 text-white' : 'bg-blue-700 text-white'}`}>{editIndex !== null ? "Update Record" : "Save Asset"}</button>
                    {editIndex !== null && <button onClick={() => {setEditIndex(null); setFormData({name:"", mot:"", ins:"", svc:"", tax:"", ref:"", link:""})}} className="bg-gray-200 px-6 rounded-xl font-bold text-gray-600">Cancel</button>}
                </div>
            </section>

            {/* List */}
            <div className="px-4 mb-4">
                <input className="w-full p-3 rounded-2xl border-2 border-gray-200 outline-none text-sm shadow-sm focus:border-blue-400" placeholder="🔍 Search Assets..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <main className="px-4 space-y-3">
                {filtered.map((asset, i) => (
                    <div key={i} onClick={() => {setEditIndex(i); setFormData(asset); window.scrollTo({top:0, behavior:'smooth'});}} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-600 active:bg-blue-50 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="font-bold text-blue-900 leading-tight">{asset.name}</h3>
                                <p className="text-[9px] text-gray-400 font-medium uppercase mt-1">Ref: {asset.ref || '—'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => downloadIcs(e, asset)} className="bg-green-50 text-green-700 p-2 rounded-lg border border-green-100 text-[10px] font-bold uppercase">ICS</button>
                                <button onClick={(e) => { e.stopPropagation(); if(confirm("Delete?")) saveData(assets.filter((_, idx) => idx !== i)); }} className="text-red-200 p-2 font-bold">✕</button>
                            </div>
                        </div>
                    </div>
                ))}
            </main>

            {/* --- OVERLAY: CHRONOLOGICAL DEADLINE LIST --- */}
            {showDeadlines && (
                <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                    <header className="p-4 bg-gray-50 border-b flex justify-between items-center sticky top-0">
                        <h2 className="font-bold text-gray-800">Upcoming Deadlines</h2>
                        <button onClick={() => setShowDeadlines(false)} className="bg-blue-700 text-white px-4 py-1 rounded-full text-sm font-bold">Close</button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {getSortedDeadlines().length === 0 ? (
                            <p className="text-center text-gray-400 mt-10">No upcoming dates found.</p>
                        ) : (
                            getSortedDeadlines().map((dl, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white border rounded-xl shadow-sm">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-blue-600">{dl.label}</p>
                                        <p className="font-bold text-gray-800">{dl.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gray-700">{dl.dateStr}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div className="h-20"></div> {/* Scroll buffer */}
                    </div>
                </div>
            )}
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));

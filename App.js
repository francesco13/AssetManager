const { useState, useEffect, useRef } = React;

const App = () => {
    const [assets, setAssets] = useState([]);
    const [search, setSearch] = useState("");
    const [editIndex, setEditIndex] = useState(null);
    const [formData, setFormData] = useState({ name: "", mot: "", ins: "", svc: "", tax: "", ref: "", link: "" });

    useEffect(() => {
        const data = localStorage.getItem("asset_data");
        if (data) setAssets(JSON.parse(data));
    }, []);

    const saveData = (newAssets) => {
        setAssets(newAssets);
        localStorage.setItem("asset_data", JSON.stringify(newAssets));
    };

    // --- CALENDAR (ICS) LOGIC ---
    const formatIcsDate = (dateStr) => {
        if (!dateStr || !dateStr.includes("/")) return null;
        const [d, m, y] = dateStr.split("/");
        if (!d || !m || !y) return null;
        return `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}`;
    };

    const downloadIcs = (asset) => {
        const deadlines = [
            { label: "MOT Due", date: asset.mot },
            { label: "Insurance Due", date: asset.ins },
            { label: "Service Due", date: asset.svc },
            { label: "Tax Due", date: asset.tax }
        ];

        let icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//AssetManager//EN"
        ];

        let hasEvents = false;

        deadlines.forEach(dl => {
            const cleanDate = formatIcsDate(dl.date);
            if (!cleanDate) return;
            hasEvents = true;

            const eventBlock = [
                "BEGIN:VEVENT",
                `SUMMARY:${dl.label}: ${asset.name}`,
                `DTSTART;VALUE=DATE:${cleanDate}`,
                `DTEND;VALUE=DATE:${cleanDate}`,
                `DESCRIPTION:Asset Ref: ${asset.ref || 'N/A'}\\nLink: ${asset.link || 'None'}`,
                "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", "DESCRIPTION:1 Week Reminder", "END:VALARM",
                "BEGIN:VALARM", "TRIGGER:-P14D", "ACTION:DISPLAY", "DESCRIPTION:2 Week Reminder", "END:VALARM",
                "BEGIN:VALARM", "TRIGGER:-P21D", "ACTION:DISPLAY", "DESCRIPTION:3 Week Reminder", "END:VALARM",
                "END:VEVENT"
            ];
            icsContent.push(...eventBlock);
        });

        if (!hasEvents) return alert("No valid dates found to create a calendar file.");

        icsContent.push("END:VCALENDAR");
        const blob = new Blob([icsContent.join("\n")], { type: "text/calendar" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${asset.name.replace(/\s+/g, '_')}_deadlines.ics`;
        link.click();
    };

    // --- FORM & LIST LOGIC ---
    const handleSave = () => {
        if (!formData.name) return alert("Asset Name is required");
        let newAssets = [...assets];
        if (editIndex !== null) {
            newAssets[editIndex] = formData;
            setEditIndex(null);
        } else {
            newAssets.unshift(formData);
        }
        saveData(newAssets);
        setFormData({ name: "", mot: "", ins: "", svc: "", tax: "", ref: "", link: "" });
    };

    const deleteAsset = (e, index) => {
        e.stopPropagation();
        if (confirm("Delete this asset?")) {
            const newAssets = assets.filter((_, i) => i !== index);
            saveData(newAssets);
        }
    };

    const filtered = assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="max-w-2xl mx-auto min-h-screen bg-gray-100 pb-10">
            {/* Header */}
            <header className="bg-blue-800 p-4 text-white shadow-md flex justify-between items-center sticky top-0 z-30">
                <h1 className="font-bold text-lg">AssetManager</h1>
                <button onClick={() => {
                    const dataStr = JSON.stringify(assets, null, 2);
                    const blob = new Blob([dataStr], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "assets_backup.json"; a.click();
                }} className="text-[10px] bg-blue-700 px-2 py-1 rounded border border-blue-500 uppercase font-bold">Backup Data</button>
            </header>

            {/* Input Grid (Always Visible) */}
            <section className="bg-white p-4 shadow-md mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="p-2 border rounded bg-gray-50 text-sm outline-none focus:border-blue-500" placeholder="Asset Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input className="p-2 border rounded bg-gray-50 text-sm outline-none focus:border-blue-500" placeholder="Reference #" value={formData.ref} onChange={e => setFormData({...formData, ref: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    {['mot', 'ins', 'svc', 'tax'].map(key => (
                        <div key={key}>
                            <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">{key === 'ins' ? 'Insurance' : key}</label>
                            <input className="w-full p-2 border rounded bg-gray-50 text-sm" placeholder="DD/MM/YYYY" value={formData[key]} onChange={e => setFormData({...formData, [key]: e.target.value})} />
                        </div>
                    ))}
                </div>
                <input className="w-full p-2 border rounded bg-gray-50 mt-3 text-sm" placeholder="Website Link (https://...)" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} />
                <div className="flex gap-2 mt-4">
                    <button onClick={handleSave} className="flex-1 bg-blue-700 text-white font-bold py-3 rounded-lg active:bg-blue-900 transition-colors">
                        {editIndex !== null ? "Update Asset" : "Save Asset"}
                    </button>
                    {editIndex !== null && (
                        <button onClick={() => {setEditIndex(null); setFormData({name:"", mot:"", ins:"", svc:"", tax:"", ref:"", link:""})}} className="bg-gray-200 px-4 rounded-lg text-gray-600">Cancel</button>
                    )}
                </div>
            </section>

            {/* Search */}
            <div className="px-4 mb-4">
                <input className="w-full p-3 rounded-xl border-2 border-gray-200 outline-none text-sm shadow-sm" placeholder="🔍 Filter list..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* List */}
            <main className="px-4 space-y-3">
                {filtered.map((asset, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-600">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1" onClick={() => { setFormData(asset); setEditIndex(i); window.scrollTo(0,0); }}>
                                <h3 className="font-bold text-blue-900 leading-tight">{asset.name}</h3>
                                <p className="text-[10px] text-gray-400 italic">Ref: {asset.ref || 'N/A'}</p>
                            </div>
                            <div className="flex gap-2">
                                {/* CALENDAR EXPORT BUTTON */}
                                <button 
                                    onClick={() => downloadIcs(asset)}
                                    className="bg-green-50 text-green-700 p-2 rounded-lg border border-green-100 flex items-center gap-1 active:bg-green-100"
                                    title="Download Calendar File"
                                >
                                    <span className="text-xs font-bold uppercase">📅 ICS</span>
                                </button>
                                <button onClick={(e) => deleteAsset(e, i)} className="text-red-200 hover:text-red-500 p-2 text-xl">✕</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600">
                            <div><span className="font-bold text-gray-400 mr-1">MOT:</span> {asset.mot || '—'}</div>
                            <div><span className="font-bold text-gray-400 mr-1">INS:</span> {asset.ins || '—'}</div>
                            <div><span className="font-bold text-gray-400 mr-1">SVC:</span> {asset.svc || '—'}</div>
                            <div><span className="font-bold text-gray-400 mr-1">TAX:</span> {asset.tax || '—'}</div>
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));

const { useState, useEffect, useRef } = React;

const App = () => {
    const [assets, setAssets] = useState([]);
    const [search, setSearch] = useState("");
    const [editIndex, setEditIndex] = useState(null);
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

    // --- NEW: TIMESTAMP GENERATOR ---
    const getTimestamp = () => {
        const now = new Date();
        return now.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }); // Result: "22 Mar, 13:50"
    };

    const handleSave = () => {
        if (!formData.name) return alert("Asset Name is required");
        
        // Add timestamp to the data object
        const recordToSave = { ...formData, lastUpdated: getTimestamp() };
        
        let newAssets = [...assets];
        if (editIndex !== null) {
            newAssets[editIndex] = recordToSave;
            setEditIndex(null);
        } else {
            newAssets.unshift(recordToSave);
        }
        
        saveData(newAssets);
        setFormData({ name: "", mot: "", ins: "", svc: "", tax: "", ref: "", link: "" });
    };

    // --- PREVIOUS LOGIC (Restore, Backup, ICS) ---
    const restoreData = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    if (confirm(`Restore ${importedData.length} assets?`)) saveData(importedData);
                }
            } catch (err) { alert("Invalid backup file."); }
        };
        reader.readAsText(file);
    };

    const downloadIcs = (e, asset) => {
        e.stopPropagation();
        const formatIcsDate = (dateStr) => {
            if (!dateStr || !dateStr.includes("/")) return null;
            const [d, m, y] = dateStr.split("/");
            return `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}`;
        };
        let icsContent = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AssetManager//EN"];
        const keys = { mot: "MOT", ins: "Insurance", svc: "Service", tax: "Tax" };
        Object.keys(keys).forEach(key => {
            const cleanDate = formatIcsDate(asset[key]);
            if (cleanDate) {
                icsContent.push("BEGIN:VEVENT", `SUMMARY:${keys[key]}: ${asset.name}`, `DTSTART;VALUE=DATE:${cleanDate}`, `DTEND;VALUE=DATE:${cleanDate}`, "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", "END:VALARM", "END:VEVENT");
            }
        });
        icsContent.push("END:VCALENDAR");
        const blob = new Blob([icsContent.join("\n")], { type: "text/calendar" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = `${asset.name}.ics`; a.click();
    };

    const filtered = assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="max-w-2xl mx-auto min-h-screen bg-gray-100 pb-10">
            <header className="bg-blue-800 p-4 text-white shadow-md flex justify-between items-center sticky top-0 z-40">
                <h1 className="font-bold text-lg">AssetManager</h1>
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={restoreData} accept=".json" className="hidden" />
                    <button onClick={() => fileInputRef.current.click()} className="text-[10px] bg-blue-600 px-2 py-1 rounded border border-blue-400 font-bold uppercase">Restore</button>
                    <button onClick={() => {
                        const blob = new Blob([JSON.stringify(assets, null, 2)], { type: "application/json" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob); a.download = "backup.json"; a.click();
                    }} className="text-[10px] bg-blue-700 px-2 py-1 rounded border border-blue-500 font-bold uppercase">Backup</button>
                </div>
            </header>

            <section className={`p-4 shadow-md mb-4 border-b-2 transition-colors ${editIndex !== null ? 'bg-amber-50 border-amber-200' : 'bg-white border-blue-100'}`}>
                <h2 className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{editIndex !== null ? "📝 Editing Record" : "➕ Add New Asset"}</h2>
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
                <input className="w-full p-2 border rounded bg-gray-50 mt-3 text-sm" placeholder="Website Link" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} />
                <div className="flex gap-2 mt-4">
                    <button onClick={handleSave} className={`flex-1 font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all ${editIndex !== null ? 'bg-amber-600 text-white' : 'bg-blue-700 text-white'}`}>{editIndex !== null ? "Update Record" : "Save Asset"}</button>
                    {editIndex !== null && <button onClick={() => {setEditIndex(null); setFormData({name:"", mot:"", ins:"", svc:"", tax:"", ref:"", link:""})}} className="bg-gray-200 px-6 rounded-xl font-bold text-gray-600">Cancel</button>}
                </div>
            </section>

            <div className="px-4 mb-4">
                <input className="w-full p-3 rounded-2xl border-2 border-gray-200 outline-none text-sm shadow-sm focus:border-blue-400" placeholder="🔍 Filter list..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <main className="px-4 space-y-3">
                {filtered.map((asset, i) => (
                    <div key={i} onClick={() => {setEditIndex(i); setFormData(asset); window.scrollTo({top:0, behavior:'smooth'});}} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-600 active:bg-blue-50 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="font-bold text-blue-900 leading-tight">{asset.name}</h3>
                                {/* DISPLAY THE TIMESTAMP */}
                                <p className="text-[9px] text-gray-400 font-medium uppercase mt-1">
                                    {asset.lastUpdated ? `Updated: ${asset.lastUpdated}` : 'Legacy Record'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => downloadIcs(e, asset)} className="bg-green-50 text-green-700 p-2 rounded-lg border border-green-100 text-[10px] font-bold">📅 ICS</button>
                                <button onClick={(e) => { e.stopPropagation(); if(confirm("Delete?")) saveData(assets.filter((_, idx) => idx !== i)); }} className="text-red-200 p-2 font-bold">✕</button>
                            </div>
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));

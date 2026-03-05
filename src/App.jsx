import { useState, useEffect } from 'react';
import * as api from './api.js'
import './App.css';
import Sidebar from './sidebars/sidebar';
import TableInfo from './table/tableInfo';



export default function App() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tableInfo, setTableInfo] = useState(null);
    const [infoLoading, setInfoLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        api.getListTables()
            .then(response => { if (!mounted) return; setItems(Array.isArray(response.data) ? response.data : response); })
            .catch(e => { if (mounted) setError(e.message) })
            .finally(() => { if (mounted) setLoading(false) });
        return () => { mounted = false };
    }, []);

    async function handleCreate(payload) {
        // payload: { tableName, columns }
        const resp = await api.postCreateTable(payload);
        const name = resp?.data ?? resp;
        if (name) setItems(prev => [name, ...prev]);
        return name;
    }

    async function onClickTable(name) {
        setTableInfo(null);
        setInfoLoading(true);
        setError(null);
        try {
            const rows = await api.getTable(name);
            const tableReports = await api.getListReports(name);
            setTableInfo({ name, rows, tableReports} );
        } catch (e) {
            setError(e.message);
        } finally {
            setInfoLoading(false);
        }
    }

    return (
        <div className="app">
            <header className="app__header"><h1>Таблицы</h1></header>
            <div className="app__main">
                <Sidebar items={items} loading={loading} error={error} onCreate={handleCreate} onClickTable={onClickTable} />

                <section className="content">
                    {infoLoading && <p className="muted">Загрузка информации...</p>}
                    {!infoLoading && tableInfo && (
                        <div className="info">
                            <h2>Информация о таблице</h2>
                            <TableInfo tableInfo={tableInfo}/>
                        </div>
                    )}
                    {!infoLoading && !tableInfo && <p className="muted">Выберите таблицу слева</p>}
                </section>
            </div>
        </div>
    );
}

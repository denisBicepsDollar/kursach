import { useState, useEffect } from 'react';
import * as api from './api.js'
import './App.css';
import Sidebar from './sidebar/sidebar';
import TableInfo from './table/tableInfo';


export default function App() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tableInfo, setTableInfo] = useState(null);
    const [tableData, setTableData] = useState(null);
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
        setTableData(null);
        setInfoLoading(true);
        setError(null);
        try {
            const info = await api.getTable(name);
            setTableInfo(info);
            const data = await api.getListRows(name);
            setTableData(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setInfoLoading(false);
        }
    }

    async function onGenerateReport(name) {
        try {
            const res = await api.generateReport(name);
            // ожидаем { url }
            if (res?.url) window.open(res.url, '_blank');
            else {
                // если пришёл файл blob
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
        } catch (e) {
            setError(e.message || 'Ошибка генерации отчёта');
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
                            <TableInfo tableInfo={tableInfo} tableData={tableData} onGenerateReport={() => onGenerateReport(tableInfo?.data?.table_name ?? tableInfo?.data?.name)} />
                        </div>
                    )}
                    {!infoLoading && !tableInfo && <p className="muted">Выберите таблицу слева</p>}
                </section>
            </div>
        </div>
    );
}

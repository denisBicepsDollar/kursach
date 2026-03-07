import { useState, useEffect } from 'react';
import * as api from './api.js'
import './app.css';
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
            .then(response => {
                if (!mounted) return;
                setItems(response.data || response);
            })
            .catch(e => {
                if (mounted) setError(e.message)
            })
            .finally(() => {
                if (mounted) setLoading(false)
            });
        return () => {
            mounted = false
        };
    }, []);

    async function onClickTable(tableName) {
        setTableInfo(null);
        setInfoLoading(true);
        setError(null);
        try {
            const rows = await api.getTable(tableName);
            const tableReports = await api.getListReports(tableName);
            setTableInfo({tableName, rows, tableReports});
        } catch (e) {
            setError(e.message);
        } finally {
            setInfoLoading(false);
        }
    }

    return (
        <div className="app">
            <header className="header">
                <h1>Таблицы</h1>
            </header>

            <div className="all-Content">
                <aside className="sidebar">
                    <Sidebar
                        items={items}
                        loading={loading}
                        error={error}
                        onClickTable={onClickTable}
                    />
                </aside>

                <main className="main-content">
                    {infoLoading && <p className="muted">Загрузка информации...</p>}

                    {!infoLoading && tableInfo && (
                        <div className="info">
                            <h2 className="header-title header-left">Информация о таблице</h2>
                            <TableInfo tableInfo={tableInfo}/>
                        </div>
                    )}

                    {!infoLoading && !tableInfo && <p className="muted">Выберите таблицу слева</p>}
                </main>
            </div>
        </div>
    );
}

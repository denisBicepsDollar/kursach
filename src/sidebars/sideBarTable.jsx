import React, { useState } from 'react';
import { AddFormReport } from '../addForm/addForm.jsx';
import * as api from '../api.js';
import './sidebar.css';

export default function SidebarTable({ tableName}) {
    const [loading, setLoading] = useState(false);

    const handleDeleteTable = async () => {
        if (!tableName) {
            alert('Таблица не выбрана');
            return;
        }
        if (!confirm(`Удалить таблицу "${tableName}" ?`)) return;
        try {
            setLoading(true);
            await api.deleteTable(tableName);
            alert('Таблица удалена');
            window.location.href = '/tables';
        } catch (e) {
            alert(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <aside className="sidebar">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div>
                    <AddFormReport tableName={tableName}/>
                </div>
                <button
                    type="button"
                    onClick={handleDeleteTable}
                    className="danger"
                    disabled={loading || !tableName}
                    style={{ marginLeft: 8 }}
                >
                    {loading ? 'Удаление...' : 'Удалить таблицу'}
                </button>
            </div>
        </aside>
    );
}

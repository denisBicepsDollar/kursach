import React, { useState } from 'react';
import { AddFormReport } from '../addForm/addFormReport.jsx';
import * as api from '../api.js';
import '../index.css';

export default function SidebarTable({ tableName, onActionComplete}) {
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
            <div className="body-content" style={{ padding: '0px' }}>
                <AddFormReport tableName={tableName} onCreate={onActionComplete} />
                <button
                    type="button"
                    onClick={handleDeleteTable}
                    className="btn-danger"
                    disabled={loading || !tableName}
                >
                    {loading ? 'Удаление...' : 'Удалить таблицу'}
                </button>
            </div>
    );
}

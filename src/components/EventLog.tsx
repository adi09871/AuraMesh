// src/components/EventLog.tsx

import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { EventType, Severity } from '../types';
import { Download, Trash2 } from 'lucide-react';
import { dbService } from '../services/db';
import './EventLog.css';

function EventLog() {
  const { events, loadEvents, filterEvents, clearOldEvents } = useAppStore();
  const [filterType, setFilterType] = useState<EventType | undefined>();
  const [filterSeverity, setFilterSeverity] = useState<Severity | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  // useEffect(() => {
  //   loadEvents();
  // }, []);

  const handleFilterChange = (type?: EventType, severity?: Severity) => {
    setFilterType(type);
    setFilterSeverity(severity);
    filterEvents(type, severity);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const data = format === 'json'
        ? await dbService.exportAsJSON()
        : await dbService.exportAsCSV();

      const element = document.createElement('a');
      element.setAttribute(
        'href',
        `data:text/${format === 'json' ? 'json' : 'csv'};charset=utf-8,${encodeURIComponent(data)}`
      );
      element.setAttribute('download', `auramesh-export-${Date.now()}.${format}`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearOld = async () => {
    if (window.confirm('Clear events older than 72 hours?')) {
      await clearOldEvents(72);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filterType && e.type !== filterType) return false;
    if (filterSeverity && e.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="event-log-container">
      <div className="log-header">
        <h2>Event Log</h2>
        <div className="log-controls">
          <button
            className="btn-secondary"
            onClick={() => handleExport('json')}
            disabled={isExporting || events.length === 0}
            title="Export as JSON"
          >
            <Download size={14} />
            JSON
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleExport('csv')}
            disabled={isExporting || events.length === 0}
            title="Export as CSV"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            className="btn-secondary"
            onClick={handleClearOld}
            disabled={events.length === 0}
            title="Clear old events"
          >
            <Trash2 size={14} />
            Clear Old
          </button>
        </div>
      </div>

      <div className="log-filters">
        <div className="filter-group">
          <label>
            <input
              type="checkbox"
              checked={filterType === undefined}
              onChange={() => handleFilterChange(undefined, filterSeverity)}
            />
            <span>All Types</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={filterType === 'sos'}
              onChange={() =>
                handleFilterChange(filterType === 'sos' ? undefined : 'sos', filterSeverity)
              }
            />
            <span>SOS</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={filterType === 'keyword'}
              onChange={() =>
                handleFilterChange(filterType === 'keyword' ? undefined : 'keyword', filterSeverity)
              }
            />
            <span>Keywords</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={filterType === 'system'}
              onChange={() =>
                handleFilterChange(filterType === 'system' ? undefined : 'system', filterSeverity)
              }
            />
            <span>System</span>
          </label>
        </div>

        <div className="filter-group">
          <label>
            <input
              type="checkbox"
              checked={filterSeverity === undefined}
              onChange={() => handleFilterChange(filterType, undefined)}
            />
            <span>All Severities</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={filterSeverity === 'critical'}
              onChange={() =>
                handleFilterChange(
                  filterType,
                  filterSeverity === 'critical' ? undefined : 'critical'
                )
              }
            />
            <span>Critical</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={filterSeverity === 'warning'}
              onChange={() =>
                handleFilterChange(
                  filterType,
                  filterSeverity === 'warning' ? undefined : 'warning'
                )
              }
            />
            <span>Warning</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={filterSeverity === 'info'}
              onChange={() =>
                handleFilterChange(filterType, filterSeverity === 'info' ? undefined : 'info')
              }
            />
            <span>Info</span>
          </label>
        </div>
      </div>

      <div className="log-content">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <p>No events match your filters.</p>
          </div>
        ) : (
          <div className="event-table">
            <div className="table-header">
              <div className="col-time">Timestamp</div>
              <div className="col-type">Type</div>
              <div className="col-severity">Severity</div>
              <div className="col-title">Title</div>
              <div className="col-desc">Description</div>
            </div>

            {filteredEvents.map((event) => (
              <div key={event.id} className={`table-row severity-${event.severity}`}>
                <div className="col-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
                <div className="col-type">{event.type}</div>
                <div className="col-severity">
                  <span className={`badge severity-${event.severity}`}>{event.severity}</span>
                </div>
                <div className="col-title">{event.title}</div>
                <div className="col-desc">{event.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="log-footer">
        <span className="total-events">Total: {filteredEvents.length} events</span>
      </div>
    </div>
  );
}

export default EventLog;

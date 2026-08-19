import React, { useEffect, useState } from 'react';
import { Routes, Route, useOutletContext, NavLink, useParams, useLocation, Link } from 'react-router-dom';
import styles from './SimulationModule.module.css';
import { simulationService } from '../../services/simulationService';
import SimulationInstanceUpload from './SimulationInstanceUpload';
import SimulationResultsViewer from './SimulationResultsViewer';
import CreateEventModal from './CreateEventModal';
import StudentSearchBar from './StudentSearchBar';
import EstadoAcademicoView from './EstadoAcademicoView';

function SimulationModule() {
  const { userRole, activeCycleId } = useOutletContext();

  const [allSimulationEvents, setAllSimulationEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [simulationInstances, setSimulationInstances] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!activeCycleId) {
      setAllSimulationEvents([]);
      setSelectedEventId(null);
      setSimulationInstances([]);
      setEventsLoading(false);
      return;
    }

    fetchAllSimulationEvents();
  }, [activeCycleId]);

  useEffect(() => {
    if (selectedEventId && activeCycleId) {
      fetchSimulationInstances(selectedEventId);
    } else {
      setSimulationInstances([]);
    }
  }, [selectedEventId, activeCycleId]);

  const fetchAllSimulationEvents = async () => {
    setEventsLoading(true);
    setError('');
    try {
      const data = await simulationService.getSimulationEvents(activeCycleId);
      setAllSimulationEvents(data);
      setSelectedEventId(data.length > 0 ? data[0].id : null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar los eventos de simulacro');
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchSimulationInstances = async (eventId) => {
    setInstancesLoading(true);
    setError('');
    try {
      const data = await simulationService.getSimulationInstancesByEvent(eventId, activeCycleId);
      setSimulationInstances(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar el historial de archivos');
    } finally {
      setInstancesLoading(false);
    }
  };

  const handleEventSelect = (eventId) => {
    setSelectedEventId(eventId);
  };

  const handleDeleteEvent = async (eventId, eventName, event) => {
    event.stopPropagation();
    const confirmDelete = window.confirm(`Estas seguro de que deseas eliminar el evento "${eventName}"? Se borraran todos los resultados asociados.`);

    if (!confirmDelete) {
      return;
    }

    try {
      await simulationService.deleteSimulationEvent(eventId);
      const updatedEvents = allSimulationEvents.filter((item) => item.id !== eventId);
      setAllSimulationEvents(updatedEvents);
      if (selectedEventId === eventId) {
        setSelectedEventId(updatedEvents.length > 0 ? updatedEvents[0].id : null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar el evento.');
    }
  };

  const handleSaveEvent = async (payload) => {
    await simulationService.createSimulationEvent(payload);
    fetchAllSimulationEvents();
  };

  const handleDeleteInstance = async (instanceId, event) => {
    event.stopPropagation();
    const confirmDelete = window.confirm('Estas seguro de que deseas eliminar la instancia de simulacro? Esta accion no se puede deshacer.');

    if (!confirmDelete) {
      return;
    }

    try {
      await simulationService.deleteSimulationInstance(instanceId);
      setSimulationInstances((prev) => prev.filter((instance) => Number(instance.id) !== Number(instanceId)));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar la instancia de simulacro.');
    }
  };

  if (!activeCycleId) {
    return (
      <div className={styles.simulationModule}>
        <h2 className={styles.moduleTitle}>Simulacros</h2>
        <div className={styles.errorMessage}>Selecciona un ciclo en Matricula para trabajar este modulo.</div>
      </div>
    );
  }

  return (
    <div className={styles.simulationModule}>
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSaveEvent}
        activeCycleId={activeCycleId}
      />

      <h2 className={styles.moduleTitle}>Simulacros</h2>

      {(userRole === 'admin' || userRole === 'matriculador' || userRole === 'kami') && (
        <StudentSearchBar activeCycleId={activeCycleId} />
      )}

      <div className={styles.contentWrapper}>
        <div className={styles.leftPanel}>
          <div className={styles.leftSection}>
            <div className={styles.leftSectionHeader}>
              <h4>Eventos de Simulacro</h4>
              <button
                onClick={() => setCreateModalOpen(true)}
                className={styles.addEventButton}
                aria-label="Crear Nuevo Evento de Simulacro"
              >
                +
              </button>
            </div>

            {eventsLoading && <p>Cargando eventos...</p>}
            {error && !eventsLoading && <p className={styles.errorMessage}>{error}</p>}

            {allSimulationEvents.length > 0 ? (
              <ul className={styles.modalityList}>
                {allSimulationEvents.map((eventItem) => (
                  <li key={eventItem.id} className={styles.modalityItem}>
                    <button
                      onClick={() => handleEventSelect(eventItem.id)}
                      className={`${styles.modalityButton} ${eventItem.id === selectedEventId ? styles.selected : ''}`}
                    >
                      {eventItem.name}
                    </button>

                    {(userRole === 'admin' || userRole === 'kami') && (
                      <button
                        className={styles.deleteEventButton}
                        onClick={(event) => handleDeleteEvent(eventItem.id, eventItem.name, event)}
                        title="Eliminar Evento"
                      >
                        🗑️
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              !eventsLoading && <p>No hay eventos creados.</p>
            )}
          </div>

          {selectedEventId && (
            <div className={styles.leftSection}>
              <div className={styles.leftSectionHeader}>
                <h4>Historial de Archivos Subidos</h4>
              </div>

              {instancesLoading && <p>Cargando historial...</p>}

              {simulationInstances.length > 0 ? (
                <ul className={styles.modalityList}>
                  {simulationInstances.map((instance) => (
                    <li key={instance.id} className={styles.modalityItem}>
                      <NavLink
                        to={`/dashboard/simulacros/resultados/${instance.id}`}
                        className={({ isActive }) => `${styles.eventLink} ${isActive ? styles.activeEventLink : ''}`}
                      >
                        {instance.fileName}
                      </NavLink>
                      {(userRole === 'admin' || userRole === 'kami') && (
                        <button
                          className={styles.deleteEventButton}
                          onClick={(event) => handleDeleteInstance(instance.id, event)}
                          title="Eliminar Instancia de Simulacion"
                        >
                          🗑️
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                !instancesLoading && <p>No hay archivos para este evento en el ciclo activo.</p>
              )}
            </div>
          )}
        </div>

        <div className={styles.mainContent}>
          <Routes>
            <Route
              index
              element={<EventDashboard selectedEventId={selectedEventId} allSimulationEvents={allSimulationEvents} />}
            />
            <Route
              path=":eventId/upload"
              element={
                <SimulationInstanceUploadWrapper
                  activeCycleId={activeCycleId}
                  userRole={userRole}
                  allSimulationEvents={allSimulationEvents}
                  onUploadComplete={fetchSimulationInstances}
                />
              }
            />
            <Route
              path="resultados/:instanceId"
              element={<SimulationResultsViewer activeCycleId={activeCycleId} userRole={userRole} />}
            />
            <Route
              path="estado-academico/:studentId"
              element={<EstadoAcademicoView activeCycleId={activeCycleId} userRole={userRole} />}
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function EventDashboard({ selectedEventId, allSimulationEvents }) {
  const location = useLocation();
  const uploadState = location.state;

  if (!selectedEventId) {
    return <h3>Selecciona un evento de la lista o crea uno nuevo.</h3>;
  }

  const selectedEvent = allSimulationEvents.find((event) => event.id === selectedEventId);

  if (!selectedEvent) {
    return <h3>Evento no encontrado.</h3>;
  }

  return (
    <div className={styles.eventDashboard}>
      <h3>{selectedEvent.name}</h3>
      {uploadState?.uploadSuccess && (
        <div className={styles.successMessage}>
          <p>Resultados importados correctamente.</p>
          {uploadState.instanceId && (
            <Link to={`/dashboard/simulacros/resultados/${uploadState.instanceId}`}>
              Ver resultados importados
            </Link>
          )}
        </div>
      )}
      <p>Has seleccionado un evento. Ahora puedes subir un nuevo archivo de resultados para este ciclo.</p>
      <NavLink to={`${selectedEventId}/upload`} className={styles.uploadActionLink}>
        + Subir Nuevos Resultados
      </NavLink>
    </div>
  );
}

function SimulationInstanceUploadWrapper({ activeCycleId, userRole, allSimulationEvents, onUploadComplete }) {
  const { eventId } = useParams();
  const currentEvent = allSimulationEvents.find((event) => String(event.id) === eventId);

  if (!currentEvent) {
    return <p>Cargando evento o evento no encontrado...</p>;
  }

  return (
    <SimulationInstanceUpload
      activeCycleId={activeCycleId}
      userRole={userRole}
      eventId={parseInt(eventId, 10)}
      simulationEvent={currentEvent}
      modalityName={currentEvent.name}
      onUploadComplete={onUploadComplete}
    />
  );
}

export default SimulationModule;

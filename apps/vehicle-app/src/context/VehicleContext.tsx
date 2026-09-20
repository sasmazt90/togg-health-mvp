'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { mockVehicleInstance } from '@packages/vehicle-context/MockVehicleProvider';
import { VehicleState } from '@packages/vehicle-context/types';

interface VehicleContextType {
  state: VehicleState;
  toggleDrivingMode: () => void;
  setSpeed: (speed: number) => void;
  isParked: boolean;
  isMoving: boolean;
  canAccessVisualModules: boolean;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehicleState, setVehicleState] = useState<VehicleState>(mockVehicleInstance.getState());

  useEffect(() => {
    const unsubscribe = mockVehicleInstance.subscribe((newState) => {
      setVehicleState(newState);
    });
    return () => unsubscribe();
  }, []);

  const toggleDrivingMode = () => {
    mockVehicleInstance.toggleDrivingMode();
  };

  const setSpeed = (speed: number) => {
    mockVehicleInstance.setSpeed(speed);
  };

  const isParked = vehicleState.vehicleParked;
  const isMoving = vehicleState.vehicleMoving;
  const canAccessVisualModules = isParked;

  return (
    <VehicleContext.Provider
      value={{
        state: vehicleState,
        toggleDrivingMode,
        setSpeed,
        isParked,
        isMoving,
        canAccessVisualModules,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicle = (): VehicleContextType => {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicle, VehicleContextProvider içinde kullanılmalıdır.');
  }
  return context;
};

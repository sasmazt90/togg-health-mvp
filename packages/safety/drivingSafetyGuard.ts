import { VehicleState } from '../vehicle-context/types';

export interface ModuleAccessCheck {
  allowed: boolean;
  reasonTr?: string;
}

export function canAccessVisualModule(vehicleState: VehicleState, moduleName: string): ModuleAccessCheck {
  if (vehicleState.vehicleMoving || vehicleState.currentSpeed > 0) {
    return {
      allowed: false,
      reasonTr: `Sürüş güvenliğiniz için ${moduleName} testi araç hareket halindeyken başlatılamaz. Lütfen aracı Park (P) moduna alın.`
    };
  }
  return { allowed: true };
}

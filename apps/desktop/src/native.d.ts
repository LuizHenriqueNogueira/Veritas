export {};
declare global {
  interface Window {
    electronAPI?: {
      isDesktop:boolean; plataforma:string;
      captureScreen:()=>Promise<string|null>;
      backendUrl:()=>Promise<string>;
      setFloatingEnabled:(enabled:boolean)=>Promise<void>;
      onFloatingDisabled:(handler:()=>void)=>()=>void;
    };
  }
}

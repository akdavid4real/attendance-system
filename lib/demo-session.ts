export type DemoUser = {
  fullName: string;
  email: string;
};

const demoUserKey = "attendance_demo_user";

export function saveDemoUser(user: DemoUser) {
  localStorage.setItem(demoUserKey, JSON.stringify(user));
}

export function getDemoUser(): DemoUser | null {
  const raw = localStorage.getItem(demoUserKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DemoUser;
  } catch {
    localStorage.removeItem(demoUserKey);
    return null;
  }
}

export function clearDemoUser() {
  localStorage.removeItem(demoUserKey);
}

export const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#F3F4F6",
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    color: "#1F2933",
  },

  sidebar: {
    width: 250,
    background:
      "linear-gradient(180deg, #8B0000 0%, #C8102E 55%, #A0001C 100%)",
    color: "#ffffff",
    padding: "26px 20px",
    boxSizing: "border-box",
    boxShadow: "8px 0 28px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  logoBox: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },

  logo: {
    width: 165,
    maxWidth: "100%",
    objectFit: "contain",
  },

  sidebarMenu: {
    display: "grid",
    gap: 10,
  },

  menuItemActive: {
    padding: "13px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.18)",
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.22)",
  },

  menuItem: {
    padding: "13px 14px",
    borderRadius: 12,
    color: "rgba(255,255,255,0.78)",
    fontWeight: 500,
  },

  main: {
    flex: 1,
    padding: "32px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 24,
  },

  eyebrow: {
    margin: 0,
    color: "#C8102E",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  title: {
    margin: "6px 0 6px",
    fontSize: 30,
    fontWeight: 800,
    color: "#111827",
  },

  subtitle: {
    margin: 0,
    color: "#667085",
    fontSize: 15,
  },

  userCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#ffffff",
    padding: "12px 16px",
    borderRadius: 16,
    boxShadow: "0 8px 22px rgba(16, 24, 40, 0.08)",
    border: "1px solid #EAECF0",
  },

  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#C8102E",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  userName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: "#344054",
  },

  userEmail: {
    margin: 0,
    fontSize: 12,
    color: "#98A2B3",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 24,
  },

  statCard: {
    background: "#ffffff",
    borderRadius: 18,
    padding: "20px 22px",
    border: "1px solid #EAECF0",
    boxShadow: "0 8px 22px rgba(16, 24, 40, 0.06)",
  },

  statLabel: {
    margin: 0,
    color: "#667085",
    fontSize: 13,
    fontWeight: 600,
  },

  statValue: {
    margin: "8px 0 0",
    color: "#C8102E",
    fontSize: 30,
    fontWeight: 800,
  },

  statValueSmall: {
    margin: "12px 0 0",
    color: "#027A48",
    fontSize: 22,
    fontWeight: 800,
  },

  contentCard: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 22,
    border: "1px solid #EAECF0",
    boxShadow: "0 10px 28px rgba(16, 24, 40, 0.08)",
  },

  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    fontWeight: 800,
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#667085",
    fontSize: 14,
  },

  actions: {
    display: "flex",
    gap: 10,
  },

  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#C8102E",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(200, 16, 46, 0.28)",
  },

  deleteButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #FECACA",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    transition: "all 0.15s",
  },

  error: {
    background: "#FEE2E2",
    border: "1px solid #FECACA",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: "1rem",
    color: "#991B1B",
    fontSize: 14,
  },

  tableWrapper: {
    border: "1px solid #EAECF0",
    borderRadius: 14,
    overflow: "hidden",
    background: "#ffffff",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },

  thead: {
    background: "#F9FAFB",
  },

  thCenter: {
    padding: "12px 18px",
    borderBottom: "1px solid #EAECF0",
    textAlign: "center",
  },

  th: {
    padding: "12px 18px",
    fontWeight: 700,
    fontSize: 13,
    color: "#667085",
    borderBottom: "1px solid #EAECF0",
  },

  checkbox: {
    accentColor: "#C8102E",
    cursor: "pointer",
  },

  tr: {
    borderBottom: "1px solid #F2F4F7",
    transition: "background 0.15s",
  },

  modelName: {
    fontWeight: 700,
    color: "#111827",
  },

  dateCell: {
    padding: "15px 18px",
    color: "#98A2B3",
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  executeButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "#ECFDF3",
    color: "#027A48",
    border: "1px solid #ABEFC6",
    borderRadius: 8,
    padding: "7px 13px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  emptyCell: {
    padding: "3.5rem",
    textAlign: "center",
    color: "#98A2B3",
    fontSize: 14,
  },

  logoutButton: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.28)",
    background: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "Center",
    transition: "all 0.15s",
  },
};

export default styles;
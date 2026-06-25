const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const seedPassword = process.env.SEED_USER_PASSWORD || "Password123!";

async function main() {
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      passwordHash,
      role: "admin",
      status: "active",
    },
    create: {
      name: "FieldOps Admin",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
      status: "active",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {
      passwordHash,
      role: "project_manager",
      status: "active",
    },
    create: {
      name: "Project Manager",
      email: "manager@example.com",
      passwordHash,
      role: "project_manager",
      status: "active",
    },
  });

  const fieldUser = await prisma.user.upsert({
    where: { email: "field@example.com" },
    update: {
      passwordHash,
      role: "field_user",
      status: "active",
    },
    create: {
      name: "Field User",
      email: "field@example.com",
      passwordHash,
      role: "field_user",
      status: "active",
    },
  });

  const employee = await prisma.employee.upsert({
    where: { employeeNumber: "EMP-001" },
    update: {},
    create: {
      employeeNumber: "EMP-001",
      firstName: "Field",
      lastName: "User",
      jobTitle: "Field Technician",
      trade: "Operations",
      email: "field@example.com",
      status: "active",
      userId: fieldUser.id,
    },
  });

  const project = await prisma.project.upsert({
    where: { projectCode: "FIELD-001" },
    update: {},
    create: {
      projectCode: "FIELD-001",
      name: "Sample Field Operations Project",
      description: "Seed project for local development and schema verification.",
      clientName: "Internal Operations",
      siteLocation: "Local Test Yard",
      projectManagerId: manager.id,
      status: "planned",
      employees: {
        connect: [{ id: employee.id }],
      },
    },
  });

  console.log(`Seeded users ${admin.email}, ${manager.email}, ${fieldUser.email}`);
  console.log(`Seeded demo password from SEED_USER_PASSWORD or default local password`);
  console.log(`Seeded project ${project.projectCode}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

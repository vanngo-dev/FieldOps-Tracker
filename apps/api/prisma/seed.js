const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@fieldops.local" },
    update: {},
    create: {
      name: "FieldOps Admin",
      email: "admin@fieldops.local",
      role: "admin",
      status: "active",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "pm@fieldops.local" },
    update: {},
    create: {
      name: "Project Manager",
      email: "pm@fieldops.local",
      role: "project_manager",
      status: "active",
    },
  });

  const fieldUser = await prisma.user.upsert({
    where: { email: "field.user@fieldops.local" },
    update: {},
    create: {
      name: "Field User",
      email: "field.user@fieldops.local",
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
      email: "field.user@fieldops.local",
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

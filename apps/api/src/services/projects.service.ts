import type {
  ProjectRecord,
  ProjectsRepository,
} from "../repositories/projects.repository";

export type { ProjectRecord, ProjectsRepository };

export class ProjectNotFoundError extends Error {
  constructor() {
    super("Projeto não encontrado");
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectNameAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Já existe um projeto com o nome "${name}"`);
    this.name = "ProjectNameAlreadyExistsError";
  }
}

export type CreateProjectInput = {
  userId: string;
  name: string;
  description?: string | null;
};

export async function createProject(
  repository: ProjectsRepository,
  input: CreateProjectInput,
): Promise<ProjectRecord> {
  const existing = await repository.findProjectByUserIdAndName(
    input.userId,
    input.name,
  );

  if (existing) {
    throw new ProjectNameAlreadyExistsError(input.name);
  }

  return repository.insertProject(input);
}

export async function listProjects(
  repository: ProjectsRepository,
  userId: string,
): Promise<ProjectRecord[]> {
  return repository.findProjectsByUserId(userId);
}

export type ProjectOwnerInput = {
  userId: string;
  projectId: string;
};

export async function getProject(
  repository: ProjectsRepository,
  { userId, projectId }: ProjectOwnerInput,
): Promise<ProjectRecord> {
  const project = await repository.findProjectById(projectId);

  if (!project || project.userId !== userId) {
    throw new ProjectNotFoundError();
  }

  return project;
}

export type UpdateProjectInput = ProjectOwnerInput & {
  data: { name?: string; description?: string | null };
};

export async function updateProject(
  repository: ProjectsRepository,
  { userId, projectId, data }: UpdateProjectInput,
): Promise<ProjectRecord> {
  await getProject(repository, { userId, projectId });

  if (data.name) {
    const existing = await repository.findProjectByUserIdAndName(
      userId,
      data.name,
    );

    if (existing && existing.id !== projectId) {
      throw new ProjectNameAlreadyExistsError(data.name);
    }
  }

  const updated = await repository.updateProject(projectId, data);

  if (!updated) {
    throw new ProjectNotFoundError();
  }

  return updated;
}

export async function deleteProject(
  repository: ProjectsRepository,
  { userId, projectId }: ProjectOwnerInput,
): Promise<void> {
  await getProject(repository, { userId, projectId });
  await repository.deleteProject(projectId);
}

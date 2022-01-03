import { Command, Flags } from '@oclif/core';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import Listr from 'listr';

type TaskContext = {
  repos: RestEndpointMethodTypes['repos']['listForAuthenticatedUser']['response']['data']
}

export default class DeleteAll extends Command {
  static flags = {
    accessToken: Flags.string({
      char: 'a',
      description: 'GitHub access token',
      required: true
    })
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(DeleteAll);

    const octokit = new Octokit({
      auth: flags.accessToken
    });

    const tasks = new Listr<TaskContext>([
      {
        title: 'Fetching forks',
        task: async (ctx) => {
          const data = await octokit.paginate('GET /user/repos', {
            affiliation: 'owner'
          });

          ctx.repos = data.filter(repo => repo.fork);
        }
      },
      {
        title: 'Deleting forks',
        task: (ctx) => new Listr(
          ctx.repos.map(repo => ({
              title: repo.full_name,
              task: () => octokit.repos.delete({
                owner: repo.owner.login,
                repo: repo.name
              })
            })
          ),
          { concurrent: 5 }
        )
      }
    ]);

    await tasks.run();
  }
}

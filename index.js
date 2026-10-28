require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const config = require('./config.json');

if (!process.env.TOKEN) {
  console.error('❌ TOKEN manquant dans le fichier .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.GuildMember]
});

const commands = [
  new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Envoie le panneau de création de ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages')
    .addIntegerOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre de messages à supprimer (1 à 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulse un membre')
    .addUserOption(option =>
      option.setName('membre').setDescription('Membre à expulser').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('raison').setDescription('Raison').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannit un membre')
    .addUserOption(option =>
      option.setName('membre').setDescription('Membre à bannir').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('raison').setDescription('Raison').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Met un membre en timeout')
    .addUserOption(option =>
      option.setName('membre').setDescription('Membre à sanctionner').setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('minutes')
        .setDescription('Durée en minutes')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10080)
    )
    .addStringOption(option =>
      option.setName('raison').setDescription('Raison').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Affiche les membres du staff')
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(client.user.id, config.guildId),
    { body: commands.map(cmd => cmd.toJSON()) }
  );
  console.log('✅ Commandes slash enregistrées.');
}

function safeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
}

async function sendLog(guild, embed) {
  if (!config.logsChannelId || config.logsChannelId.startsWith('ID_')) return;
  const channel = guild.channels.cache.get(config.logsChannelId);
  if (channel && channel.isTextBased()) {
    await channel.send({ embeds: [embed] }).catch(() => {});
  }
}

client.once(Events.ClientReady, async readyClient => {
  console.log(`✅ Connecté en tant que ${readyClient.user.tag}`);
  await registerCommands().catch(console.error);
});

// BIENVENUE + ROLE AUTO
client.on(Events.GuildMemberAdd, async member => {
  if (member.guild.id !== config.guildId) return;

  // Rôle automatique
  if (config.autoRoleId && !config.autoRoleId.startsWith('ID_')) {
    const role = member.guild.roles.cache.get(config.autoRoleId);
    if (role) {
      await member.roles.add(role).catch(err => {
        console.error('Erreur autorole:', err.message);
      });
    }
  }

  // Message de bienvenue
  if (config.welcomeChannelId && !config.welcomeChannelId.startsWith('ID_')) {
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (channel && channel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle('⚡ Bienvenue sur STØRM // PVP')
        .setDescription(
          `Bienvenue ${member} !\n\n` +
          `Tu es le **${member.guild.memberCount}e membre** du serveur.\n` +
          `Lis le règlement et prépare-toi à entrer dans l'arène.`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'STØRM // PVP' })
        .setTimestamp();

      await channel.send({ content: `${member}`, embeds: [embed] }).catch(console.error);
    }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    // COMMANDES
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'ticket-panel') {
        const embed = new EmbedBuilder()
          .setTitle('🎫 Support STØRM // PVP')
          .setDescription(
            'Besoin d’aide ?\n\n' +
            'Clique sur le bouton ci-dessous pour ouvrir un ticket privé avec le staff.'
          )
          .setFooter({ text: 'Un seul ticket par personne.' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Créer un ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: '✅ Panneau envoyé.', ephemeral: true });
      }

      if (interaction.commandName === 'clear') {
        const count = interaction.options.getInteger('nombre');
        const deleted = await interaction.channel.bulkDelete(count, true);
        return interaction.reply({
          content: `✅ ${deleted.size} message(s) supprimé(s).`,
          ephemeral: true
        });
      }

      if (interaction.commandName === 'kick') {
        const user = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison') || 'Aucune raison précisée';
        const member = await interaction.guild.members.fetch(user.id);

        if (!member.kickable) {
          return interaction.reply({
            content: '❌ Je ne peux pas expulser ce membre.',
            ephemeral: true
          });
        }

        await member.kick(reason);

        const embed = new EmbedBuilder()
          .setTitle('👢 Membre expulsé')
          .addFields(
            { name: 'Membre', value: `${user.tag}`, inline: true },
            { name: 'Staff', value: `${interaction.user.tag}`, inline: true },
            { name: 'Raison', value: reason }
          )
          .setTimestamp();

        await sendLog(interaction.guild, embed);

        return interaction.reply({
          content: `✅ **${user.tag}** a été expulsé.`,
          ephemeral: true
        });
      }

      if (interaction.commandName === 'ban') {
        const user = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison') || 'Aucune raison précisée';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member && !member.bannable) {
          return interaction.reply({
            content: '❌ Je ne peux pas bannir ce membre.',
            ephemeral: true
          });
        }

        await interaction.guild.members.ban(user.id, { reason });

        const embed = new EmbedBuilder()
          .setTitle('🔨 Membre banni')
          .addFields(
            { name: 'Membre', value: `${user.tag}`, inline: true },
            { name: 'Staff', value: `${interaction.user.tag}`, inline: true },
            { name: 'Raison', value: reason }
          )
          .setTimestamp();

        await sendLog(interaction.guild, embed);

        return interaction.reply({
          content: `✅ **${user.tag}** a été banni.`,
          ephemeral: true
        });
      }

      if (interaction.commandName === 'timeout') {
        const user = interaction.options.getUser('membre');
        const minutes = interaction.options.getInteger('minutes');
        const reason = interaction.options.getString('raison') || 'Aucune raison précisée';

        const member = await interaction.guild.members.fetch(user.id);

        if (!member.moderatable) {
          return interaction.reply({
            content: '❌ Je ne peux pas mettre ce membre en timeout.',
            ephemeral: true
          });
        }

        await member.timeout(minutes * 60 * 1000, reason);

        const embed = new EmbedBuilder()
          .setTitle('⏱️ Timeout')
          .addFields(
            { name: 'Membre', value: `${user.tag}`, inline: true },
            { name: 'Durée', value: `${minutes} minute(s)`, inline: true },
            { name: 'Staff', value: `${interaction.user.tag}`, inline: true },
            { name: 'Raison', value: reason }
          )
          .setTimestamp();

        await sendLog(interaction.guild, embed);

        return interaction.reply({
          content: `✅ **${user.tag}** est en timeout pendant **${minutes} minute(s)**.`,
          ephemeral: true
        });
      }

      if (interaction.commandName === 'staff') {
        if (!config.ticketStaffRoleId || config.ticketStaffRoleId.startsWith('ID_')) {
          return interaction.reply({
            content: '❌ Configure d’abord `ticketStaffRoleId` dans config.json.',
            ephemeral: true
          });
        }

        const role = interaction.guild.roles.cache.get(config.ticketStaffRoleId);
        if (!role) {
          return interaction.reply({
            content: '❌ Rôle staff introuvable.',
            ephemeral: true
          });
        }

        await interaction.guild.members.fetch();
        const staff = role.members.map(m => `• ${m}`).join('\n') || 'Aucun membre staff trouvé.';

        const embed = new EmbedBuilder()
          .setTitle('🛡️ Staff STØRM // PVP')
          .setDescription(staff)
          .setFooter({ text: `${role.members.size} membre(s) dans le staff` });

        return interaction.reply({ embeds: [embed] });
      }
    }

    // CREATION TICKET
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
      const existing = interaction.guild.channels.cache.find(
        ch => ch.name === `ticket-${safeName(interaction.user.username)}`
      );

      if (existing) {
        return interaction.reply({
          content: `❌ Tu as déjà un ticket ouvert : ${existing}`,
          ephemeral: true
        });
      }

      const overwrites = [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles
          ]
        }
      ];

      if (config.ticketStaffRoleId && !config.ticketStaffRoleId.startsWith('ID_')) {
        overwrites.push({
          id: config.ticketStaffRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages
          ]
        });
      }

      const channel = await interaction.guild.channels.create({
        name: `ticket-${safeName(interaction.user.username)}`,
        type: ChannelType.GuildText,
        parent:
          config.ticketCategoryId && !config.ticketCategoryId.startsWith('ID_')
            ? config.ticketCategoryId
            : undefined,
        permissionOverwrites: overwrites,
        topic: `Ticket de ${interaction.user.tag} (${interaction.user.id})`
      });

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Fermer le ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket ouvert')
        .setDescription(
          `${interaction.user}, explique ton problème ici.\n\n` +
          `Un membre du staff va te répondre.`
        )
        .setFooter({ text: 'STØRM // PVP Support' })
        .setTimestamp();

      await channel.send({
        content:
          config.ticketStaffRoleId && !config.ticketStaffRoleId.startsWith('ID_')
            ? `<@&${config.ticketStaffRoleId}> ${interaction.user}`
            : `${interaction.user}`,
        embeds: [embed],
        components: [closeRow]
      });

      return interaction.reply({
        content: `✅ Ton ticket a été créé : ${channel}`,
        ephemeral: true
      });
    }

    // FERMETURE TICKET
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      if (!interaction.channel.name.startsWith('ticket-')) {
        return interaction.reply({
          content: '❌ Ce bouton ne peut être utilisé que dans un ticket.',
          ephemeral: true
        });
      }

      await interaction.reply('🔒 Fermeture du ticket...');

      const logEmbed = new EmbedBuilder()
        .setTitle('🎫 Ticket fermé')
        .addFields(
          { name: 'Salon', value: interaction.channel.name },
          { name: 'Fermé par', value: interaction.user.tag }
        )
        .setTimestamp();

      await sendLog(interaction.guild, logEmbed);

      setTimeout(() => {
        interaction.channel.delete('Ticket fermé').catch(console.error);
      }, 2000);
    }
  } catch (error) {
    console.error(error);

    if (interaction.isRepliable()) {
      const payload = {
        content: '❌ Une erreur est survenue.',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  }
});

client.login(process.env.TOKEN);

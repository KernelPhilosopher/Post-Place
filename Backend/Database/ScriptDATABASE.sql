-- =============================================================================
-- Script para la creación del esquema de la base de datos para el ChatRoom Global
-- Base de Datos: PostgreSQL
-- =============================================================================
-- Desactivar temporalmente las verificaciones de claves foráneas para evitar errores durante la creación
-- SET session_replication_role = 'replica';
-- =============================================================================
-- Tabla: Usuario
-- Almacena la información de los usuarios registrados en la plataforma.
-- =============================================================================
CREATE TABLE USUARIO (
	-- ID único para cada usuario. Es la llave primaria (PK).
	-- SERIAL es un tipo de dato de PostgreSQL que se autoincrementa.
	USER_ID SERIAL PRIMARY KEY,
	-- Nombre del usuario. No puede ser nulo.
	NOMBRE VARCHAR(100) NOT NULL,
	-- Email del usuario. Debe ser único y no puede ser nulo.
	EMAIL VARCHAR(255) UNIQUE NOT NULL,
	-- Contraseña del usuario. Se recomienda almacenar un hash, no el texto plano.
	CONTRASEÑA VARCHAR(255) NOT NULL,
	-- Fecha y hora de creación del registro. Se establece automáticamente.
	FECHA_CREACIÓN TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Tabla: TipoPost
-- Almacena los diferentes tipos o categorías de posts (ej: 'General', 'Pregunta').
-- =============================================================================
CREATE TABLE TIPOPOST (
	-- ID único para cada tipo de post. Es la llave primaria (PK).
	TYPE_ID SERIAL PRIMARY KEY,
	-- Nombre del tipo de post. Debe ser único para evitar duplicados.
	NOMBRE_TIPO VARCHAR(50) UNIQUE NOT NULL
);

-- =============================================================================
-- Tabla: Post
-- Almacena las publicaciones creadas por los usuarios.
-- =============================================================================
CREATE TABLE POST (
	-- ID único para cada post. Es la llave primaria (PK).
	POST_ID SERIAL PRIMARY KEY,
	-- Título del post. Es opcional.
	TITULO VARCHAR(255) NULL,
	-- Contenido principal del post. No puede estar vacío.
	CONTENIDO TEXT NOT NULL,
	-- Fecha y hora de creación del post.
	FECHA_CREACION TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	-- Fecha y hora de la última actualización del post. Puede ser nulo si nunca se ha editado.
	FECHA_ACTUALIZACION TIMESTAMP WITH TIME ZONE,
	-- Llave foránea (FK) que referencia al usuario que creó el post.
	-- Si el usuario es eliminado, todos sus posts también se eliminan (ON DELETE CASCADE).
	USER_ID INTEGER NOT NULL,
	CONSTRAINT FK_USUARIO FOREIGN KEY (USER_ID) REFERENCES USUARIO (USER_ID) ON DELETE CASCADE,
	-- Llave foránea (FK) que referencia al tipo de post.
	-- Si un tipo de post se elimina, el valor en esta columna se vuelve nulo (ON DELETE SET NULL).
	TYPE_ID INTEGER,
	CONSTRAINT FK_TIPO_POST FOREIGN KEY (TYPE_ID) REFERENCES TIPOPOST (TYPE_ID) ON DELETE SET NULL
);

-- =============================================================================
-- Tabla: Comentario
-- Almacena los comentarios hechos por los usuarios en los posts.
-- =============================================================================
CREATE TABLE COMENTARIO (
	-- ID único para cada comentario. Es la llave primaria (PK).
	COMMENT_ID SERIAL PRIMARY KEY,
	-- Contenido del comentario. No puede estar vacío.
	CONTENIDO TEXT NOT NULL,
	-- Fecha y hora de creación del comentario.
	FECHA_CREACIÓN TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	-- Fecha y hora de la última actualización del comentario.
	FECHA_ACTUALIZACIÓN TIMESTAMP WITH TIME ZONE,
	-- Llave foránea (FK) que referencia al post que se está comentando.
	-- Si el post es eliminado, todos sus comentarios también se eliminan.
	POST_ID INTEGER NOT NULL,
	CONSTRAINT FK_POST FOREIGN KEY (POST_ID) REFERENCES POST (POST_ID) ON DELETE CASCADE,
	-- Llave foránea (FK) que referencia al usuario que hizo el comentario.
	-- Si el usuario es eliminado, todos sus comentarios también se eliminan.
	USER_ID INTEGER NOT NULL,
	CONSTRAINT FK_USUARIO FOREIGN KEY (USER_ID) REFERENCES USUARIO (USER_ID) ON DELETE CASCADE
);

-- Reactivar las verificaciones de claves foráneas
-- SET session_replication_role = 'origin';
-- =============================================================================
-- Fin del script.
-- =============================================================================
En el presente tutorial describimos el proceso para desplegar la aplicacion en un entorno de `Kubernetes` previamente configurado. Este procedimiento puede ser ejecutado manualmente o de forma automatizada mediante un `Gitlab Runner`.

### Construcción de la imagen en Docker
Lo primero que tenemos que realizar es construir la imagen docker de nuestra aplicacion con el siguiente comando ejecutandolo desde la raiz de nuestro proyecto:
```BASH
$ docker build -t jasu-server .
```
Esto construye una imagen docker a partir del `Dockerfile` de nuestro proyecto y de nuestro código fuente.

Posteriormente pasamos a ejecutar nuestro contenedor para verificar que funcione adecuadamente:
```BASH
$ docker run --name jasu-server -e NODE_ENV=development -p 4000:4000 --rm -it jasu-server
```
Este comando nos va a generar un contenedor ejecutandose en nuestro equipo. A continuación debemos obtener el ID del contenedor que se está ejecutando, para ello podemos ejecutar los siguientes comandos:

Listar los contenedores en uso:
```BASH
$ docker container ls
```

Esto nos va a generar una lista de contenedores  con informacion util de los mismos: 
```BASH
CONTAINER ID   IMAGE       COMMAND                  CREATED       STATUS      PORTS                    NAMES
9a104428d22b   jasu-server   "docker-entrypoint.s…"   5 weeks ago   Up 4 days   0.0.0.0:4000->4000/tcp   jasu-server
```

El dato que necesitamos para realizar nuestro despliegue el el ID. Procedemos a ejecutar un commit del contaner para direccionarlo al espacio `container registry` que tenemos configurado.

```BASH
$ docker container commit <YOUR_CONTAINER_ID> jasu-server:v1.1.0
```

Posteriormente de haber hecho nuestro commit de la imagen procederemos a tagear nuestra nueva imagen hacia el `container registry``
```BASH
$ docker image tag jasu-server:v1.1.0 registry.digitalocean.com/bluepixel/jasu-server:v1.1.0
```

Para finalizar nuestro commit con docker procedemos a realizar un push: 
```BASH
$ docker image push registry.digitalocean.com/bluepixel/jasu-server:v1.1.0
```

Esto subirá nuestra imagen al espacion `container registry`y podremos aplicar el deployment de la imagen que se sibió al cluster de `Kubernetes`
```BASH
$ kubectl apply -f deploy.yaml
```
***Nota:*** Este despliegue se realiza mediante el archivo de configuracion `deploy.yaml`que se encuentra en la raiz del proyecto. Es necesario tener instalada y configurada la herramienta de `kubectl`y `doctl`.

***Importante:*** Si es la primera vez que se aplica un despliegue al cluster es necesario crear un servicio que se comunique con el servicio ìngress controller`con el cual se balancea la carga.
```BASH
$ kubectl expose deployment/jasu --type="NodePort" --port 4000
```
Este paso solo se realiza una sola vez.

### Documentacion adicional
- [Tu aplicacion en micro servicios](https://www.digitalocean.com/community/tech_talks/how-to-deploy-your-application-or-microservice-as-a-kubernetes-deployment)
- [Como usar Jenkins con Kubernetes](https://www.digitalocean.com/community/tutorials/how-to-install-jenkins-on-kubernetes)
- [Conectar servicios y aplicaciones](https://kubernetes.io/docs/concepts/services-networking/connect-applications-service/)
- [Configurar pods](https://kubernetes.io/docs/tasks/configure-pod-container/translate-compose-kubernetes/)
